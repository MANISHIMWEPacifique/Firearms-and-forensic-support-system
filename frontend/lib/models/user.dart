class User {
  final int id;
  final String username;
  final String fullName;
  final UserRole role;
  final String? email;
  final String? phone;
  final int? unitId;
  final String? unitName;
  final bool unitConfirmed;
  final bool isActive;

  User({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    this.email,
    this.phone,
    this.unitId,
    this.unitName,
    required this.unitConfirmed,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      fullName: json['fullName'] ?? json['full_name'],
      role: UserRole.fromString(json['role']),
      email: json['email'],
      phone: json['phone'],
      unitId: json['unitId'] ?? json['unit_id'],
      unitName: json['unitName'] ?? json['unit_name'],
      unitConfirmed: json['unitConfirmed'] ?? json['unit_confirmed'] ?? false,
      isActive: json['isActive'] ?? json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'fullName': fullName,
      'role': role.toString(),
      'email': email,
      'phone': phone,
      'unitId': unitId,
      'unitName': unitName,
      'unitConfirmed': unitConfirmed,
      'isActive': isActive,
    };
  }
}

enum UserRole {
  admin,
  hqFirearmCommander,
  stationCommander,
  forensicAnalyst,
  auditor;

  static UserRole fromString(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return UserRole.admin;
      case 'HQ_FIREARM_COMMANDER':
        return UserRole.hqFirearmCommander;
      case 'STATION_COMMANDER':
        return UserRole.stationCommander;
      case 'FORENSIC_ANALYST':
        return UserRole.forensicAnalyst;
      case 'AUDITOR':
        return UserRole.auditor;
      default:
        throw Exception('Unknown role: $role');
    }
  }

  String get displayName {
    switch (this) {
      case UserRole.admin:
        return 'System Administrator';
      case UserRole.hqFirearmCommander:
        return 'HQ Firearm Commander';
      case UserRole.stationCommander:
        return 'Station Commander';
      case UserRole.forensicAnalyst:
        return 'Forensic Analyst';
      case UserRole.auditor:
        return 'Auditor';
    }
  }

  @override
  String toString() {
    switch (this) {
      case UserRole.admin:
        return 'ADMIN';
      case UserRole.hqFirearmCommander:
        return 'HQ_FIREARM_COMMANDER';
      case UserRole.stationCommander:
        return 'STATION_COMMANDER';
      case UserRole.forensicAnalyst:
        return 'FORENSIC_ANALYST';
      case UserRole.auditor:
        return 'AUDITOR';
    }
  }
}
