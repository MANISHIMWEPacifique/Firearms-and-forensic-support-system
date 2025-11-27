class LifecycleEvent {
  final int id;
  final int? firearmId;
  final LifecycleEventType eventType;
  final EventStatus status;
  final int requestedBy;
  final int? approvedBy;
  final String requestDetails;
  final String? approvalComments;
  final DateTime requestedAt;
  final DateTime? reviewedAt;

  // Additional fields from join
  final String? serialNumber;
  final String? manufacturer;
  final String? model;
  final String? unitName;
  final String? requestedByName;
  final String? approvedByName;

  LifecycleEvent({
    required this.id,
    this.firearmId,
    required this.eventType,
    required this.status,
    required this.requestedBy,
    this.approvedBy,
    required this.requestDetails,
    this.approvalComments,
    required this.requestedAt,
    this.reviewedAt,
    this.serialNumber,
    this.manufacturer,
    this.model,
    this.unitName,
    this.requestedByName,
    this.approvedByName,
  });

  factory LifecycleEvent.fromJson(Map<String, dynamic> json) {
    return LifecycleEvent(
      id: json['id'],
      firearmId: json['firearmId'] ?? json['firearm_id'],
      eventType: LifecycleEventType.fromString(
        json['eventType'] ?? json['event_type']
      ),
      status: EventStatus.fromString(json['status']),
      requestedBy: json['requestedBy'] ?? json['requested_by'],
      approvedBy: json['approvedBy'] ?? json['approved_by'],
      requestDetails: json['requestDetails'] ?? json['request_details'],
      approvalComments: json['approvalComments'] ?? json['approval_comments'],
      requestedAt: DateTime.parse(json['requestedAt'] ?? json['requested_at']),
      reviewedAt: json['reviewedAt'] != null
          ? DateTime.parse(json['reviewedAt'])
          : (json['reviewed_at'] != null
              ? DateTime.parse(json['reviewed_at'])
              : null),
      serialNumber: json['serialNumber'] ?? json['serial_number'],
      manufacturer: json['manufacturer'],
      model: json['model'],
      unitName: json['unitName'] ?? json['unit_name'],
      requestedByName: json['requestedByName'] ?? json['requested_by_name'],
      approvedByName: json['approvedByName'] ?? json['approved_by_name'],
    );
  }
}

enum LifecycleEventType {
  lossReport,
  destructionRequest,
  procurementRequest;

  static LifecycleEventType fromString(String type) {
    switch (type.toUpperCase()) {
      case 'LOSS_REPORT':
        return LifecycleEventType.lossReport;
      case 'DESTRUCTION_REQUEST':
        return LifecycleEventType.destructionRequest;
      case 'PROCUREMENT_REQUEST':
        return LifecycleEventType.procurementRequest;
      default:
        throw Exception('Unknown event type: $type');
    }
  }

  String get displayName {
    switch (this) {
      case LifecycleEventType.lossReport:
        return 'Loss Report';
      case LifecycleEventType.destructionRequest:
        return 'Destruction Request';
      case LifecycleEventType.procurementRequest:
        return 'Procurement Request';
    }
  }

  @override
  String toString() {
    switch (this) {
      case LifecycleEventType.lossReport:
        return 'LOSS_REPORT';
      case LifecycleEventType.destructionRequest:
        return 'DESTRUCTION_REQUEST';
      case LifecycleEventType.procurementRequest:
        return 'PROCUREMENT_REQUEST';
    }
  }
}

enum EventStatus {
  pending,
  approved,
  rejected;

  static EventStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return EventStatus.pending;
      case 'APPROVED':
        return EventStatus.approved;
      case 'REJECTED':
        return EventStatus.rejected;
      default:
        throw Exception('Unknown event status: $status');
    }
  }

  String get displayName {
    switch (this) {
      case EventStatus.pending:
        return 'Pending';
      case EventStatus.approved:
        return 'Approved';
      case EventStatus.rejected:
        return 'Rejected';
    }
  }
}
