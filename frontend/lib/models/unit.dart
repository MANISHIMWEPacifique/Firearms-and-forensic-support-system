class Unit {
  final int id;
  final String name;
  final UnitType unitType;
  final String? location;
  final String? commanderName;
  final String? contactPhone;
  final bool isActive;
  final int? personnelCount;
  final int? firearmsCount;

  Unit({
    required this.id,
    required this.name,
    required this.unitType,
    this.location,
    this.commanderName,
    this.contactPhone,
    required this.isActive,
    this.personnelCount,
    this.firearmsCount,
  });

  factory Unit.fromJson(Map<String, dynamic> json) {
    return Unit(
      id: json['id'],
      name: json['name'],
      unitType: UnitType.fromString(json['unitType'] ?? json['unit_type']),
      location: json['location'],
      commanderName: json['commanderName'] ?? json['commander_name'],
      contactPhone: json['contactPhone'] ?? json['contact_phone'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      personnelCount: json['personnelCount'] ?? json['personnel_count'],
      firearmsCount: json['firearmsCount'] ?? json['firearms_count'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'unitType': unitType.toString(),
      'location': location,
      'commanderName': commanderName,
      'contactPhone': contactPhone,
      'isActive': isActive,
    };
  }
}

enum UnitType {
  headquarters,
  policeStation,
  trainingSchool,
  specialUnit;

  static UnitType fromString(String type) {
    switch (type.toUpperCase()) {
      case 'HEADQUARTERS':
        return UnitType.headquarters;
      case 'POLICE_STATION':
        return UnitType.policeStation;
      case 'TRAINING_SCHOOL':
        return UnitType.trainingSchool;
      case 'SPECIAL_UNIT':
        return UnitType.specialUnit;
      default:
        throw Exception('Unknown unit type: $type');
    }
  }

  String get displayName {
    switch (this) {
      case UnitType.headquarters:
        return 'Headquarters';
      case UnitType.policeStation:
        return 'Police Station';
      case UnitType.trainingSchool:
        return 'Training School';
      case UnitType.specialUnit:
        return 'Special Unit';
    }
  }

  @override
  String toString() {
    switch (this) {
      case UnitType.headquarters:
        return 'HEADQUARTERS';
      case UnitType.policeStation:
        return 'POLICE_STATION';
      case UnitType.trainingSchool:
        return 'TRAINING_SCHOOL';
      case UnitType.specialUnit:
        return 'SPECIAL_UNIT';
    }
  }
}
