import 'dart:convert';

enum Metal { gold, silver }

enum ItemCategory { coin, bar }

class PortfolioItem {
  final String id;
  final Metal metal;
  final ItemCategory category;
  final String name;          // napr. "Philharmoniker"
  final String manufacturer;  // napr. "Münze Österreich"
  final double weightOz;      // vaha (v oz ALEBO v gramoch, podla inGrams)
  final bool inGrams;         // true = vaha je v gramoch
  final String? imagePath;    // lokalna cesta k fotke (null = ziadna)
  int quantity;               // kolko ks vlastnis

  PortfolioItem({
    required this.id,
    required this.metal,
    required this.category,
    required this.name,
    required this.manufacturer,
    required this.weightOz,
    this.inGrams = false,
    this.imagePath,
    this.quantity = 0,
  });

  /// Vaha prepoctena na gramy (1 oz = 31.1035 g)
  double get toGrams => inGrams ? weightOz : weightOz * 31.1035;

  /// Vaha prepoctena na unce
  double get toOz => toGrams / 31.1035;

  /// Pekny label: "1 oz", "1/2 oz" ako "0.5 oz", "100 g"...
  String get weightLabel {
    String trimNum(double v) {
      if (v == v.roundToDouble()) return '${v.round()}';
      var s = v.toStringAsFixed(3);
      if (s.contains('.')) {
        s = s.replaceAll(RegExp(r'0+$'), '');
        if (s.endsWith('.')) s = s.substring(0, s.length - 1);
      }
      return s;
    }
    // zlomkove unce: 0.1 -> "1/10 oz", 0.5 -> "1/2 oz", 0.25 -> "1/4 oz"
    if (!inGrams && weightOz > 0 && weightOz < 1) {
      final recip = 1 / weightOz;
      if ((recip - recip.round()).abs() < 0.001) {
        return '1/${recip.round()} oz';
      }
    }
    return '${trimNum(weightOz)} ${inGrams ? 'g' : 'oz'}';
  }

  /// Kluč pre zoskupovanie do hmotnostnych sekcii
  String get weightKey => '$weightOz|${inGrams ? 'g' : 'oz'}';

  Map<String, dynamic> toJson() => {
        'id': id,
        'metal': metal.name,
        'category': category.name,
        'name': name,
        'manufacturer': manufacturer,
        'weightOz': weightOz,
        'inGrams': inGrams,
        'imagePath': imagePath,
        'quantity': quantity,
      };

  factory PortfolioItem.fromJson(Map<String, dynamic> j) => PortfolioItem(
        id: j['id'] as String,
        metal: Metal.values.byName(j['metal'] as String),
        category: ItemCategory.values.byName(j['category'] as String),
        name: j['name'] as String,
        manufacturer: j['manufacturer'] as String,
        weightOz: (j['weightOz'] as num).toDouble(),
        inGrams: j['inGrams'] as bool? ?? false,
        imagePath: j['imagePath'] as String?,
        quantity: j['quantity'] as int? ?? 0,
      );

  static String encodeList(List<PortfolioItem> items) =>
      jsonEncode(items.map((e) => e.toJson()).toList());

  static List<PortfolioItem> decodeList(String raw) {
    final list = (jsonDecode(raw) as List<dynamic>).cast<Map<String, dynamic>>();
    return list.map(PortfolioItem.fromJson).toList();
  }
}
