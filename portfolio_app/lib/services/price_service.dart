import 'dart:convert';
import 'package:http/http.dart' as http;

/// Vysledok jedneho pokusu o zdroj ceny.
class PriceResult {
  final double? price;
  final String source; // nazov zdroja (pre diagnostiku)
  final String? error; // kratky popis chyby
  const PriceResult(this.price, this.source, [this.error]);

  bool get ok => price != null && price! > 0;
}

/// Ceny kovov v USD za trojsku uncu + kurz USD->EUR.
/// Pre kazdy kov skusa viac zdrojov postupne, kym niektory neodpovie:
///
/// ZLATO:   1) api.gold-api.com/price/XAU
///          2) Binance PAXGUSDT (PAXG = token kryty zlatom, cena ~ spot)
///          3) stooq.com (CSV, xauusd)
/// STRIEBRO:1) api.gold-api.com/price/XAG
///          2) Kraken XAGUSD (skutocny spotovy kurz striebra!)
///          3) stooq.com (CSV, xagusd)
///
/// Kurz EUR: 1) api.frankfurter.dev/v2/rate/usd/eur
///           2) api.frankfurter.app/latest?symbols=USD
class PriceService {
  static const _goldApi = 'https://api.gold-api.com/price';
  static const _binancePaxg =
      'https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT';
  static const _krakenSilver =
      'https://api.kraken.com/0/public/Ticker?pair=XAGUSD';
  static const _yahooChart = 'https://query1.finance.yahoo.com/v8/finance/chart';
  static const _fxV2 = 'https://api.frankfurter.dev/v2/rate/usd/eur';
  static const _fxV1 = 'https://api.frankfurter.app/latest?symbols=USD';

  /// Kratky zoznam poslednych chyb/uspesnych zdrojov pre diagnostiku v UI
  static final List<String> debugLog = [];
  static void _log(String m) {
    debugLog.add(m);
    if (debugLog.length > 6) debugLog.removeAt(0);
  }

  static Future<PriceResult> fetchPriceUsdPerOz(String symbol) async {
    final isSilver = symbol.toLowerCase() == 'xag';
    final attempts = isSilver
        ? [
            _fromGoldApi(symbol),
            _fromKrakenSilver(),
            _fromYahoo('SI=F', 'yahoo-si'),
            _fromStooq('xagusd'),
          ]
        : [
            _fromGoldApi(symbol),
            _fromBinanceGold(),
            _fromYahoo('GC=F', 'yahoo-gc'),
            _fromStooq('xauusd'),
          ];
    PriceResult last = const PriceResult(null, 'ziadny', 'ziadny zdroj');
    for (final a in attempts) {
      last = await a;
      if (last.ok) return last;
    }
    return last;
  }

  // ---------- zdroje ----------

  static Future<PriceResult> _fromGoldApi(String symbol) async {
    const src = 'gold-api';
    try {
      final res = await http
          .get(Uri.parse('$_goldApi/$symbol'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 429) {
        // rate limit – pockat 3 s a skusit raz znovu
        _log('$src $symbol: HTTP 429, retry za 3 s...');
        await Future.delayed(const Duration(seconds: 3));
        final res2 = await http
            .get(Uri.parse('$_goldApi/$symbol'))
            .timeout(const Duration(seconds: 8));
        if (res2.statusCode == 200) {
          final j2 = jsonDecode(res2.body) as Map<String, dynamic>;
          final p2 = (j2['price'] as num?)?.toDouble();
          if (p2 != null && p2 > 0) {
            _log('$src $symbol: OK (retry)');
            return PriceResult(p2, src);
          }
        }
        _log('$src $symbol: HTTP ${res2.statusCode} aj po retry');
        return PriceResult(null, src, 'HTTP ${res2.statusCode}');
      }
      if (res.statusCode != 200) {
        _log('$src $symbol: HTTP ${res.statusCode}');
        return PriceResult(null, src, 'HTTP ${res.statusCode}');
      }
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      final p = (j['price'] as num?)?.toDouble();
      if (p == null || p <= 0) {
        _log('$src $symbol: zla odpoved');
        return const PriceResult(null, src, 'zla odpoved');
      }
      _log('$src $symbol: OK');
      return PriceResult(p, src);
    } catch (e) {
      _log('$src $symbol: $e');
      return PriceResult(null, src, '$e');
    }
  }

  static Future<PriceResult> _fromBinanceGold() async {
    const src = 'binance-paxg';
    try {
      final res = await http
          .get(Uri.parse(_binancePaxg))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) {
        _log('$src: HTTP ${res.statusCode}');
        return PriceResult(null, src, 'HTTP ${res.statusCode}');
      }
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      final p = double.tryParse('${j['price']}');
      if (p == null || p <= 0) {
        _log('$src: zla odpoved');
        return const PriceResult(null, src, 'zla odpoved');
      }
      _log('$src: OK');
      return PriceResult(p, src);
    } catch (e) {
      _log('$src: $e');
      return PriceResult(null, src, '$e');
    }
  }

  static Future<PriceResult> _fromKrakenSilver() async {
    const src = 'kraken-xag';
    try {
      final res = await http
          .get(Uri.parse(_krakenSilver))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) {
        _log('$src: HTTP ${res.statusCode}');
        return PriceResult(null, src, 'HTTP ${res.statusCode}');
      }
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      final error = j['error'] as List<dynamic>?;
      if (error != null && error.isNotEmpty) {
        _log('$src: ${error.first}');
        return PriceResult(null, src, '${error.first}');
      }
      final result = j['result'] as Map<String, dynamic>?;
      final pair = result?.values.first as Map<String, dynamic>?;
      final c = pair?['c'] as List<dynamic>?; // posledny obchod [cena, lot]
      final p = c != null ? double.tryParse('${c[0]}') : null;
      if (p == null || p <= 0) {
        _log('$src: zla odpoved');
        return const PriceResult(null, src, 'zla odpoved');
      }
      _log('$src: OK');
      return PriceResult(p, src);
    } catch (e) {
      _log('$src: $e');
      return PriceResult(null, src, '$e');
    }
  }

  /// Yahoo Finance chart API (GC=F zlate futures, SI=F strieborne futures)
  static Future<PriceResult> _fromYahoo(String ticker, String src) async {
    try {
      final url = '$_yahooChart/$ticker?interval=1d';
      final res =
          await http.get(Uri.parse(url)).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) {
        _log('$src: HTTP ${res.statusCode}');
        return PriceResult(null, src, 'HTTP ${res.statusCode}');
      }
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      final chart = j['chart'] as Map<String, dynamic>?;
      final resultList = chart?['result'] as List<dynamic>?;
      if (resultList == null || resultList.isEmpty) {
        _log('$src: prazdna odpoved');
        return PriceResult(null, src, 'prazdna odpoved');
      }
      final meta = resultList.first['meta'] as Map<String, dynamic>?;
      final p = (meta?['regularMarketPrice'] as num?)?.toDouble();
      if (p == null || p <= 0) {
        _log('$src: cena chyba');
        return PriceResult(null, src, 'cena chyba');
      }
      _log('$src: OK');
      return PriceResult(p, src);
    } catch (e) {
      _log('$src: $e');
      return PriceResult(null, src, '$e');
    }
  }

  static Future<PriceResult> _fromStooq(String s) async {
    const src = 'stooq';
    try {
      final url = 'https://stooq.com/q/l/?s=$s&f=sd2t2ohlcv&e=csv';
      final res =
          await http.get(Uri.parse(url)).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) {
        _log('$src $s: HTTP ${res.statusCode}');
        return PriceResult(null, src, 'HTTP ${res.statusCode}');
      }
      final lines = res.body.trim().split('\n');
      if (lines.length < 2 || lines[1].contains('N/D')) {
        _log('$src $s: prazdna odpoved');
        return const PriceResult(null, src, 'prazdna odpoved');
      }
      final cols = lines[1].split(',');
      if (cols.length < 7) {
        _log('$src $s: zly CSV format');
        return const PriceResult(null, src, 'zly format');
      }
      final close = double.tryParse(cols[6].trim());
      if (close == null || close <= 0) {
        _log('$src $s: cena v CSV chyba');
        return const PriceResult(null, src, 'cena chyba');
      }
      _log('$src $s: OK');
      return PriceResult(close, src);
    } catch (e) {
      _log('$src $s: $e');
      return PriceResult(null, src, '$e');
    }
  }

  /// Cena kryptomeny v EUR z Kraken (verejny endpoint, bez kluca).
  /// Kraken ma specialne tickery: BTC -> XXBTZEUR, ETH -> XETHZEUR,
  /// ostatne zvycajne SYMBOL+EUR (napr. SOLEUR, ADAEUR).
  static Future<double?> fetchKrakenEur(String symbol) async {
    const quirks = {'BTC': 'XXBTZEUR', 'XBT': 'XXBTZEUR', 'ETH': 'XETHZEUR'};
    final pair = quirks[symbol.toUpperCase()] ?? '${symbol.toUpperCase()}EUR';
    try {
      final res = await http
          .get(Uri.parse('https://api.kraken.com/0/public/Ticker?pair=$pair'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      final error = j['error'] as List<dynamic>?;
      if (error != null && error.isNotEmpty) return null;
      final result = j['result'] as Map<String, dynamic>?;
      final ticker = result?.values.first as Map<String, dynamic>?;
      final c = ticker?['c'] as List<dynamic>?;
      final p = c != null ? double.tryParse('${c[0]}') : null;
      return (p != null && p > 0) ? p : null;
    } catch (_) {
      return null;
    }
  }

  /// Kolko EUR dostanes za 1 USD.
  static Future<PriceResult> fetchEurPerUsd() async {
    // 1. Frankfurter v2
    const srcV2 = 'fx-v2';
    try {
      final res = await http
          .get(Uri.parse(_fxV2))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final j = jsonDecode(res.body) as Map<String, dynamic>;
        final r = (j['rate'] as num?)?.toDouble();
        if (r != null && r > 0) {
          _log('$srcV2: OK');
          return PriceResult(r, srcV2);
        }
        _log('$srcV2: rate chyba');
      } else {
        _log('$srcV2: HTTP ${res.statusCode}');
      }
    } catch (e) {
      _log('$srcV2: $e');
    }
    // 2. Frankfurter v1
    const srcV1 = 'fx-v1';
    try {
      final res = await http
          .get(Uri.parse(_fxV1))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final j = jsonDecode(res.body) as Map<String, dynamic>;
        final usdPerEur =
            ((j['rates'] as Map<String, dynamic>?)?['USD'] as num?)
                ?.toDouble();
        if (usdPerEur != null && usdPerEur > 0) {
          _log('$srcV1: OK');
          return PriceResult(1 / usdPerEur, srcV1);
        }
        _log('$srcV1: rates.USD chyba');
      } else {
        _log('$srcV1: HTTP ${res.statusCode}');
      }
    } catch (e) {
      _log('$srcV1: $e');
    }
    return const PriceResult(null, 'fx', 'vsetko zlyhalo');
  }
}
