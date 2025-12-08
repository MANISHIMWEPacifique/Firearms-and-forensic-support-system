const db = require('../config/database');
const kmeans = require('ml-kmeans');
const { Matrix } = require('ml-matrix');

/**
 * ML.js-based Anomaly Detection for Firearm Custody Patterns
 * 
 * Detects:
 * - Rapid custody exchanges (multiple transfers in short time)
 * - Unusual custody patterns (atypical for unit/officer)
 * - Prolonged absence (firearm not returned when expected)
 * - Frequent transfers (firearm changing hands too often)
 */

// Analyze custody logs to detect anomalies
async function detectAnomalies() {
    try {
        console.log('Starting anomaly detection...');

        // Get all custody logs from the last 90 days
        const custodyLogs = await db.query(`
      SELECT cl.*, 
             f.id as firearm_id,
             f.serial_number,
             f.assigned_unit_id,
             o.id as officer_id,
             o.badge_number,
             o.unit_id as officer_unit_id
      FROM custody_logs cl
      JOIN firearms f ON cl.firearm_id = f.id
      LEFT JOIN officers o ON cl.officer_id = o.id
      WHERE cl.timestamp >= NOW() - INTERVAL '90 days'
      ORDER BY cl.timestamp ASC
    `);

        if (custodyLogs.rows.length === 0) {
            console.log('No custody logs found for analysis');
            return { detected: 0, anomalies: [] };
        }

        const detectedAnomalies = [];

        // 1. Rapid Exchange Detection
        const rapidExchanges = detectRapidExchanges(custodyLogs.rows);
        detectedAnomalies.push(...rapidExchanges);

        // 2. Frequency-based Anomalies
        const frequentTransfers = detectFrequentTransfers(custodyLogs.rows);
        detectedAnomalies.push(...frequentTransfers);

        // 3. Prolonged Absence Detection
        const prolongedAbsences = await detectProlongedAbsences();
        detectedAnomalies.push(...prolongedAbsences);

        // 4. Statistical Outlier Detection using K-Means
        const statisticalOutliers = detectStatisticalOutliers(custodyLogs.rows);
        detectedAnomalies.push(...statisticalOutliers);

        // Store anomalies in database
        for (const anomaly of detectedAnomalies) {
            await storeAnomaly(anomaly);
        }

        console.log(`Anomaly detection complete. Found ${detectedAnomalies.length} anomalies.`);

        return {
            detected: detectedAnomalies.length,
            anomalies: detectedAnomalies
        };

    } catch (error) {
        console.error('Anomaly detection error:', error);
        throw error;
    }
}

// Detect rapid custody exchanges (multiple transfers within short time)
function detectRapidExchanges(logs) {
    const anomalies = [];
    const firearmGroups = {};

    // Group logs by firearm
    logs.forEach(log => {
        if (!firearmGroups[log.firearm_id]) {
            firearmGroups[log.firearm_id] = [];
        }
        firearmGroups[log.firearm_id].push(log);
    });

    // Check each firearm for rapid exchanges
    Object.keys(firearmGroups).forEach(firearmId => {
        const firearmLogs = firearmGroups[firearmId];

        // Look for multiple transfers within 24 hours
        for (let i = 0; i < firearmLogs.length - 2; i++) {
            const log1 = firearmLogs[i];
            const log2 = firearmLogs[i + 1];
            const log3 = firearmLogs[i + 2];

            const time1 = new Date(log1.timestamp);
            const time3 = new Date(log3.timestamp);
            const hoursDiff = (time3 - time1) / (1000 * 60 * 60);

            // 3 or more custody actions within 24 hours
            if (hoursDiff <= 24 && log1.action === 'ASSIGNED' && log2.action === 'TRANSFERRED') {
                anomalies.push({
                    firearmId: firearmId,
                    officerId: log3.officer_id,
                    type: 'RAPID_EXCHANGE',
                    score: Math.min(100, (24 / hoursDiff) * 30), // Higher score for faster exchanges
                    explanation: `Firearm ${log1.serial_number} had ${3} custody actions within ${hoursDiff.toFixed(1)} hours`,
                    contextData: {
                        logs: [log1.id, log2.id, log3.id],
                        timespan: hoursDiff,
                        actions: [log1.action, log2.action, log3.action]
                    }
                });
            }
        }
    });

    return anomalies;
}

// Detect firearms with unusually frequent transfers
function detectFrequentTransfers(logs) {
    const anomalies = [];
    const firearmTransferCounts = {};

    // Count transfers per firearm in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    logs.forEach(log => {
        if (log.action === 'TRANSFERRED' && new Date(log.timestamp) > thirtyDaysAgo) {
            if (!firearmTransferCounts[log.firearm_id]) {
                firearmTransferCounts[log.firearm_id] = {
                    count: 0,
                    serialNumber: log.serial_number,
                    lastOfficerId: log.officer_id
                };
            }
            firearmTransferCounts[log.firearm_id].count++;
            firearmTransferCounts[log.firearm_id].lastOfficerId = log.officer_id;
        }
    });

    // Flag firearms with more than 5 transfers in 30 days
    Object.keys(firearmTransferCounts).forEach(firearmId => {
        const data = firearmTransferCounts[firearmId];
        if (data.count > 5) {
            anomalies.push({
                firearmId: firearmId,
                officerId: data.lastOfficerId,
                type: 'FREQUENT_TRANSFERS',
                score: Math.min(100, data.count * 10),
                explanation: `Firearm ${data.serialNumber} has been transferred ${data.count} times in the last 30 days`,
                contextData: {
                    transferCount: data.count,
                    period: '30 days'
                }
            });
        }
    });

    return anomalies;
}

// Detect prolonged absences (temporary custody not returned)
async function detectProlongedAbsences() {
    const anomalies = [];

    // Get active temporary custody assignments past their expected return date
    const overdueAssignments = await db.query(`
    SELECT ca.*, 
           f.serial_number,
           o.badge_number,
           o.full_name as officer_name,
           EXTRACT(DAY FROM NOW() - ca.expected_return_date) as days_overdue
    FROM custody_assignments ca
    JOIN firearms f ON ca.firearm_id = f.id
    JOIN officers o ON ca.officer_id = o.id
    WHERE ca.is_active = TRUE
      AND ca.custody_type = 'TEMPORARY'
      AND ca.expected_return_date < NOW()
  `);

    overdueAssignments.rows.forEach(assignment => {
        anomalies.push({
            firearmId: assignment.firearm_id,
            officerId: assignment.officer_id,
            type: 'PROLONGED_ABSENCE',
            score: Math.min(100, assignment.days_overdue * 5),
            explanation: `Firearm ${assignment.serial_number} not returned by ${assignment.officer_name}. Overdue by ${assignment.days_overdue} days`,
            contextData: {
                assignmentId: assignment.id,
                daysOverdue: assignment.days_overdue,
                expectedReturnDate: assignment.expected_return_date
            }
        });
    });

    return anomalies;
}

// Detect statistical outliers using K-Means clustering
function detectStatisticalOutliers(logs) {
    const anomalies = [];

    // Calculate features for each officer's custody behavior
    const officerFeatures = {};

    logs.forEach(log => {
        if (!log.officer_id) return;

        if (!officerFeatures[log.officer_id]) {
            officerFeatures[log.officer_id] = {
                totalActions: 0,
                assignments: 0,
                returns: 0,
                transfers: 0,
                timestamps: [],
                firearmIds: new Set(),
                badge_number: log.badge_number
            };
        }

        const features = officerFeatures[log.officer_id];
        features.totalActions++;
        features.timestamps.push(new Date(log.timestamp));
        features.firearmIds.add(log.firearm_id);

        if (log.action === 'ASSIGNED') features.assignments++;
        if (log.action === 'RETURNED') features.returns++;
        if (log.action === 'TRANSFERRED') features.transfers++;
    });

    // Convert to feature matrix
    const officerIds = Object.keys(officerFeatures);

    if (officerIds.length < 5) {
        // Not enough data for clustering
        return anomalies;
    }

    const featureMatrix = officerIds.map(officerId => {
        const f = officerFeatures[officerId];

        // Calculate average time between actions
        let avgTimeBetween = 0;
        if (f.timestamps.length > 1) {
            const sorted = f.timestamps.sort((a, b) => a - b);
            const gaps = [];
            for (let i = 1; i < sorted.length; i++) {
                gaps.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60)); // hours
            }
            avgTimeBetween = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        }

        return [
            f.totalActions,
            f.assignments,
            f.returns,
            f.transfers,
            f.firearmIds.size,
            avgTimeBetween || 0
        ];
    });

    try {
        // Perform K-Means clustering (k=3: normal, suspicious, very suspicious)
        const k = Math.min(3, Math.floor(officerIds.length / 2));
        const result = kmeans(featureMatrix, k, { initialization: 'random' });

        // Find the cluster with highest average activity (potential anomaly cluster)
        const clusterAverages = result.centroids.map(centroid => {
            return centroid.reduce((sum, val) => sum + val, 0) / centroid.length;
        });

        const anomalyClusterIndex = clusterAverages.indexOf(Math.max(...clusterAverages));

        // Flag officers in the anomaly cluster
        result.clusters.forEach((clusterId, index) => {
            if (clusterId === anomalyClusterIndex) {
                const officerId = officerIds[index];
                const features = officerFeatures[officerId];

                // Calculate anomaly score based on distance from cluster center
                const score = Math.min(100, features.totalActions * 2);

                if (score > 50) { // Only flag high scores
                    anomalies.push({
                        firearmId: null, // Multiple firearms
                        officerId: parseInt(officerId),
                        type: 'UNUSUAL_PATTERN',
                        score: score,
                        explanation: `Officer ${features.badge_number} shows unusual custody pattern: ${features.totalActions} actions, ${features.firearmIds.size} firearms`,
                        contextData: {
                            totalActions: features.totalActions,
                            assignments: features.assignments,
                            returns: features.returns,
                            transfers: features.transfers,
                            uniqueFirearms: features.firearmIds.size
                        }
                    });
                }
            }
        });

    } catch (error) {
        console.error('K-Means clustering error:', error);
    }

    return anomalies;
}

// Store anomaly in database
async function storeAnomaly(anomaly) {
    try {
        // Check if similar anomaly already exists (avoid duplicates)
        const existing = await db.query(
            `SELECT id FROM anomalies 
       WHERE firearm_id = $1 
         AND officer_id = $2 
         AND anomaly_type = $3 
         AND status = 'DETECTED'
         AND detected_at > NOW() - INTERVAL '7 days'`,
            [anomaly.firearmId, anomaly.officerId, anomaly.type]
        );

        if (existing.rows.length > 0) {
            // Update existing anomaly score if higher
            await db.query(
                `UPDATE anomalies 
         SET anomaly_score = GREATEST(anomaly_score, $1),
             explanation = $2,
             context_data = $3
         WHERE id = $4`,
                [anomaly.score, anomaly.explanation, JSON.stringify(anomaly.contextData), existing.rows[0].id]
            );
        } else {
            // Insert new anomaly
            await db.query(
                `INSERT INTO anomalies 
         (firearm_id, officer_id, anomaly_type, anomaly_score, explanation, context_data, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'DETECTED')`,
                [
                    anomaly.firearmId,
                    anomaly.officerId,
                    anomaly.type,
                    anomaly.score,
                    anomaly.explanation,
                    JSON.stringify(anomaly.contextData)
                ]
            );
        }
    } catch (error) {
        console.error('Error storing anomaly:', error);
    }
}


