class Officer {
  final int id;
  final String badgeNumber;
  final String fullName;
  final String? rank;
  final int? unitId;
  final String? unitName;
  final String? phone;
  final String? email;
  final bool isActive;
  final DateTime? dateJoined;
  final int? activeFirearmsCount;

  Officer({
    required this.id,
    required this.badgeNumber,
    required this.fullName,
    this.rank,
    this.unitId,
    this.unitName,
    this.phone,
    this.email,
    required this.isActive,
    this.dateJoined,
    this.activeFirearmsCount,
  });

  factory Officer.fromJson(Map<String, dynamic> json) {
    return Officer(
      id: json['id'],
      badgeNumber: json['badgeNumber'] ?? json['badge_number'],
      fullName: json['fullName'] ?? json['full_name'],
      rank: json['rank'],
      unitId: json['unitId'] ?? json['unit_id'],
      unitName: json['unitName'] ?? json['unit_name'],
      phone: json['phone'],
      email: json['email'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      dateJoined: json['dateJoined'] != null
          ? DateTime.parse(json['dateJoined'])
          : (json['date_joined'] != null
              ? DateTime.parse(json['date_joined'])
              : null),
      activeFirearmsCount: json['activeFirearmsCount'] ?? json['active_firearms_count'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'badgeNumber': badgeNumber,
      'fullName': fullName,
      'rank': rank,
      'unitId': unitId,
      'phone': phone,
      'email': email,
      'isActive': isActive,
    };
  }
}
