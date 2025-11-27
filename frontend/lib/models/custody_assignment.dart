class CustodyAssignment {
  final int id;
  final int firearmId;
  final int officerId;
  final CustodyType custodyType;
  final DateTime startDate;
  final DateTime? endDate;
  final DateTime? expectedReturnDate;
  final bool isActive;
  final int? assignedBy;
  final int? returnedBy;
  final String? notes;
  
  // Additional fields from join
  final String? serialNumber;
  final String? manufacturer;
  final String? model;
  final String? officerName;
  final String? badgeNumber;

  CustodyAssignment({
    required this.id,
    required this.firearmId,
    required this.officerId,
    required this.custodyType,
    required this.startDate,
    this.endDate,
    this.expectedReturnDate,
    required this.isActive,
    this.assignedBy,
    this.returnedBy,
    this.notes,
    this.serialNumber,
    this.manufacturer,
    this.model,
    this.officerName,
    this.badgeNumber,
  });

  factory CustodyAssignment.fromJson(Map<String, dynamic> json) {
    return CustodyAssignment(
      id: json['id'],
      firearmId: json['firearmId'] ?? json['firearm_id'],
      officerId: json['officerId'] ?? json['officer_id'],
      custodyType: CustodyType.fromString(
        json['custodyType'] ?? json['custody_type']
      ),
      startDate: DateTime.parse(json['startDate'] ?? json['start_date']),
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'])
          : (json['end_date'] != null
              ? DateTime.parse(json['end_date'])
              : null),
      expectedReturnDate: json['expectedReturnDate'] != null
          ? DateTime.parse(json['expectedReturnDate'])
          : (json['expected_return_date'] != null
              ? DateTime.parse(json['expected_return_date'])
              : null),
      isActive: json['isActive'] ?? json['is_active'] ?? false,
      assignedBy: json['assignedBy'] ?? json['assigned_by'],
      returnedBy: json['returnedBy'] ?? json['returned_by'],
      notes: json['notes'],
      serialNumber: json['serialNumber'] ?? json['serial_number'],
      manufacturer: json['manufacturer'],
      model: json['model'],
      officerName: json['officerName'] ?? json['officer_name'],
      badgeNumber: json['badgeNumber'] ?? json['badge_number'],
    );
  }
}

enum CustodyType {
  permanent,
  temporary,
  personal;

  static CustodyType fromString(String type) {
    switch (type.toUpperCase()) {
      case 'PERMANENT':
        return CustodyType.permanent;
      case 'TEMPORARY':
        return CustodyType.temporary;
      case 'PERSONAL':
        return CustodyType.personal;
      default:
        throw Exception('Unknown custody type: $type');
    }
  }

  String get displayName {
    switch (this) {
      case CustodyType.permanent:
        return 'Permanent';
      case CustodyType.temporary:
        return 'Temporary';
      case CustodyType.personal:
        return 'Personal';
    }
  }

  @override
  String toString() {
    switch (this) {
      case CustodyType.permanent:
        return 'PERMANENT';
      case CustodyType.temporary:
        return 'TEMPORARY';
      case CustodyType.personal:
        return 'PERSONAL';
    }
  }
}
