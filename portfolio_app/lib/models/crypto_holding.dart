import 'dart:convert';

class CryptoHolding {
  final String id;
  final String symbol; // napr. BTC, ETH, SOL (na Kraken: XXBTZEUR, XETHZEUR...)
  final String name;
  double quantity; // mnozstvo krypta (moze byt zlomkove, napr. 0.5)

  CryptoHolding({
    required this.id,
    required this.symbol,
    required this.name,
    this.quantity = 0,
  });

  String get krakenSymbol => symbol.toUpperCase();

  Map<String, dynamic> toJson() => {
        'id': id,
        'symbol': symbol,
        'name': name,
        'quantity': quantity,
      };

  factory CryptoHolding.fromJson(Map<String, dynamic> j) => CryptoHolding(
        id: j['id'] as String,
        symbol: j['symbol'] as String,
        name: j['name'] as String,
        quantity: (j['quantity'] as num?)?.toDouble() ?? 0,
      );

  static String encodeList(List<CryptoHolding> l) =>
      jsonEncode(l.map((e) => e.toJson()).toList());

  static List<CryptoHolding> decodeList(String raw) =>
      (jsonDecode(raw) as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(CryptoHolding.fromJson)
          .toList();
}
