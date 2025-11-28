const cron = require('node-cron');
const { detectAnomalies } = require('./ml/anomalyDetection');

/**
 * Scheduled Jobs for SafeArms
 * 
 * - Anomaly Detection: Runs daily at 2 AM
 */

// Run anomaly detection daily at 2 AM
const scheduleAnomalyDetection = () => {
    // Cron format: minute hour day month weekday
    // '0 2 * * *' = Every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('Running scheduled anomaly detection...');

        try {
            const result = await detectAnomalies();
            console.log(`Anomaly detection completed. Detected: ${result.detected} anomalies`);
        } catch (error) {
            console.error('Scheduled anomaly detection failed:', error);
        }
    });

    console.log('Anomaly detection scheduled to run daily at 2:00 AM');
};

// Optional: Run anomaly detection on startup (development only)
const runAnomalyDetectionOnStartup = async () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('Running anomaly detection on startup (development mode)...');

        try {
            const result = await detectAnomalies();
            console.log(`Initial anomaly detection completed. Detected: ${result.detected} anomalies`);
        } catch (error) {
            console.error('Initial anomaly detection failed:', error);
        }
    }
};

module.exports = {
    scheduleAnomalyDetection,
    runAnomalyDetectionOnStartup
};
