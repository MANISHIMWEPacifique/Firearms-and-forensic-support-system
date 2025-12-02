class Firearm {
  final int id;
  final String serialNumber;
  final String manufacturer;
  final String model;
  final String firearmType;
  final String? caliber;
  final FirearmStatus status;
  final RegistrationLevel registrationLevel;
  final int? assignedUnitId;
  final String? unitName;
  final int? registeredBy;
  final String? registeredByName;
  final DateTime? procurementDate;
  final DateTime? lastMaintenanceDate;
  final String? notes;
  final DateTime createdAt;

  Firearm({
    required this.id,
    required this.serialNumber,
    required this.manufacturer,
    required this.model,
    required this.firearmType,
    this.caliber,
    required this.status,
    required this.registrationLevel,
    this.assignedUnitId,
    this.unitName,
    this.registeredBy,
    this.registeredByName,
    this.procurementDate,
    this.lastMaintenanceDate,
    this.notes,
    required this.createdAt,
  });

  factory Firearm.fromJson(Map<String, dynamic> json) {
    return Firearm(
      id: json['id'],
      serialNumber: json['serialNumber'] ?? json['serial_number'],
      manufacturer: json['manufacturer'],
      model: json['model'],
      firearmType: json['firearmType'] ?? json['firearm_type'],
      caliber: json['caliber'],
      status: FirearmStatus.fromString(json['status']),
      registrationLevel: RegistrationLevel.fromString(
          json['registrationLevel'] ?? json['registration_level']),
      assignedUnitId: json['assignedUnitId'] ?? json['assigned_unit_id'],
      unitName: json['unitName'] ?? json['unit_name'],
      registeredBy: json['registeredBy'] ?? json['registered_by'],
      registeredByName: json['registeredByName'] ?? json['registered_by_name'],
      procurementDate: json['procurementDate'] != null
          ? DateTime.parse(json['procurementDate'])
          : (json['procurement_date'] != null
              ? DateTime.parse(json['procurement_date'])
              : null),
      lastMaintenanceDate: json['lastMaintenanceDate'] != null
          ? DateTime.parse(json['lastMaintenanceDate'])
          : (json['last_maintenance_date'] != null
              ? DateTime.parse(json['last_maintenance_date'])
              : null),
      notes: json['notes'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
    );
  }
}

enum FirearmStatus {
  unassigned,
  assigned,
  inCustody,
  lost,
  destroyed,
  underMaintenance;

  static FirearmStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'UNASSIGNED':
        return FirearmStatus.unassigned;
      case 'ASSIGNED':
        return FirearmStatus.assigned;
      case 'IN_CUSTODY':
        return FirearmStatus.inCustody;
      case 'LOST':
        return FirearmStatus.lost;
      case 'DESTROYED':
        return FirearmStatus.destroyed;
      case 'UNDER_MAINTENANCE':
        return FirearmStatus.underMaintenance;
      default:
        throw Exception('Unknown status: $status');
    }
  }

  String get displayName {
    switch (this) {
      case FirearmStatus.unassigned:
        return 'Unassigned';
      case FirearmStatus.assigned:
        return 'Assigned';
      case FirearmStatus.inCustody:
        return 'In Custody';
      case FirearmStatus.lost:
        return 'Lost';
      case FirearmStatus.destroyed:
        return 'Destroyed';
      case FirearmStatus.underMaintenance:
        return 'Under Maintenance';
    }
  }
}

enum RegistrationLevel {
  hq,
  station;

  static RegistrationLevel fromString(String level) {
    switch (level.toUpperCase()) {
      case 'HQ':
        return RegistrationLevel.hq;
      case 'STATION':
        return RegistrationLevel.station;
      default:
        throw Exception('Unknown registration level: $level');
    }
  }

  @override
  String toString() {
    switch (this) {
      case RegistrationLevel.hq:
        return 'HQ';
      case RegistrationLevel.station:
        return 'STATION';
    }
  }
}
