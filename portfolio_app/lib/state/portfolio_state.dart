import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/portfolio_item.dart';
import '../models/crypto_holding.dart';
import '../services/price_service.dart';
import '../services/security_service.dart';

class PortfolioState extends ChangeNotifier {
  static const _storageKey = 'portfolio_items_v1';
  static const _cryptoKey = 'crypto_holdings_v1';
  static const _themeKey = 'theme_dark';
  static const _pwKey = 'pw_hash';

  final List<PortfolioItem> items = [];
  final List<CryptoHolding> cryptos = [];

  bool _loaded = false;
  bool get loaded => _loaded;

  // ---------- heslo + sifrovanie ----------
  String? _pwHash;
  String? _password; // v pamati len po odomknuti
  bool requiresPassword = false; // treba heslo pri starte

  bool get hasPassword => _pwHash != null;
  bool get isUnlocked => !hasPassword || _password != null;

  /// Odomkne appku heslom. true = OK. Nacita a desifruje data.
  Future<bool> unlock(String password) async {
    if (SecurityService.hashPassword(password) != _pwHash) return false;
    _password = password;
    final prefs = await SharedPreferences.getInstance();
    final rawItems = prefs.getString(_storageKey);
    final rawCrypto = prefs.getString(_cryptoKey);
    items.clear();
    cryptos.clear();
    if (rawItems != null && rawItems.isNotEmpty) {
      final plain = SecurityService.decrypt(rawItems, password) ?? rawItems;
      items.addAll(PortfolioItem.decodeList(plain));
    }
    if (rawCrypto != null && rawCrypto.isNotEmpty) {
      final plain = SecurityService.decrypt(rawCrypto, password) ?? rawCrypto;
      cryptos.addAll(CryptoHolding.decodeList(plain));
    }
    notifyListeners();
    loadPrices();
    loadCryptoPrices();
    return true;
  }

  /// Nastavi nove heslo (aj prvykrat). Existujuce data sa zasifruju.
  Future<void> setPassword(String password) async {
    final prefs = await SharedPreferences.getInstance();
    _pwHash = SecurityService.hashPassword(password);
    _password = password;
    requiresPassword = true;
    await prefs.setString(_pwKey, _pwHash!);
    await _save();
    await _saveCrypto();
    notifyListeners();
  }

  /// Zrusi heslo. Data sa ulozia necitatelne-plain (bez sifrovania).
  Future<void> removePassword() async {
    final prefs = await SharedPreferences.getInstance();
    _pwHash = null;
    _password = null;
    requiresPassword = false;
    await prefs.remove(_pwKey);
    await _save();
    await _saveCrypto();
    notifyListeners();
  }

  // ---------- tema (default dark) ----------
  ThemeMode themeMode = ThemeMode.dark;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _pwHash = prefs.getString(_pwKey);
    if (_pwHash != null) {
      requiresPassword = true; // data sa nacitaju az po odomknuti
    } else {
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        items
          ..clear()
          ..addAll(PortfolioItem.decodeList(raw));
      }
      final rawCrypto = prefs.getString(_cryptoKey);
      if (rawCrypto != null && rawCrypto.isNotEmpty) {
        cryptos
          ..clear()
          ..addAll(CryptoHolding.decodeList(rawCrypto));
      }
    }
    themeMode =
        (prefs.getBool(_themeKey) ?? true) ? ThemeMode.dark : ThemeMode.light;
    _loaded = true;
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    themeMode =
        themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_themeKey, themeMode == ThemeMode.dark);
  }

  /// Ulozi items – zasifrovane ak je heslo nastavene
  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = PortfolioItem.encodeList(items);
    final payload =
        _password != null ? SecurityService.encrypt(raw, _password!) : raw;
    await prefs.setString(_storageKey, payload);
  }

  Future<void> _saveCrypto() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = CryptoHolding.encodeList(cryptos);
    final payload =
        _password != null ? SecurityService.encrypt(raw, _password!) : raw;
    await prefs.setString(_cryptoKey, payload);
  }

  List<PortfolioItem> byCategory(Metal metal, ItemCategory category) =>
      items.where((e) => e.metal == metal && e.category == category).toList();

  /// Hmotnostne sekcie: kluč = weightKey, zoradene od najlahsej
  Map<String, List<PortfolioItem>> sectionsByWeight(
      Metal metal, ItemCategory category) {
    final map = <String, List<PortfolioItem>>{};
    for (final it in byCategory(metal, category)) {
      map.putIfAbsent(it.weightKey, () => []).add(it);
    }
    final keys = map.keys.toList()
      ..sort((a, b) =>
          map[a]!.first.toGrams.compareTo(map[b]!.first.toGrams));
    return {for (final k in keys) k: map[k]!};
  }

  Future<void> addItem(PortfolioItem item) async {
    items.add(item);
    notifyListeners();
    await _save();
  }

  Future<void> updateItem(PortfolioItem item) async {
    final i = items.indexWhere((e) => e.id == item.id);
    if (i >= 0) items[i] = item;
    notifyListeners();
    await _save();
  }

  Future<void> removeItem(String id) async {
    items.removeWhere((e) => e.id == id);
    notifyListeners();
    await _save();
  }

  Future<void> changeQuantity(String id, int delta) async {
    final i = items.indexWhere((e) => e.id == id);
    if (i < 0) return;
    items[i].quantity = (items[i].quantity + delta).clamp(0, 999999);
    notifyListeners();
    await _save();
  }

  double totalGrams(Metal metal) => items
      .where((e) => e.metal == metal)
      .fold(0.0, (sum, e) => sum + e.toGrams * e.quantity);

  int totalPieces(Metal metal) => items
      .where((e) => e.metal == metal)
      .fold(0, (sum, e) => sum + e.quantity);

  // ---------- ceny kovov ----------
  double? goldPricePerOz;
  double? silverPricePerOz;
  double? eurPerUsd;
  bool pricesLoading = false;
  String priceDebug = '';
  String priceSource = '';

  Future<void> loadPrices() async {
    pricesLoading = true;
    PriceService.debugLog.clear();
    notifyListeners();
    final results = await Future.wait([
      PriceService.fetchPriceUsdPerOz('XAU'),
      PriceService.fetchPriceUsdPerOz('XAG'),
      PriceService.fetchEurPerUsd(),
    ]);
    goldPricePerOz = results[0].price;
    silverPricePerOz = results[1].price;
    eurPerUsd = results[2].price;
    priceSource =
        'zlato: ${results[0].source}, striebro: ${results[1].source}, kurz: ${results[2].source}';
    priceDebug = PriceService.debugLog.join('  |  ');
    pricesLoading = false;
    notifyListeners();
  }

  double? pricePerOz(Metal metal) =>
      metal == Metal.gold ? goldPricePerOz : silverPricePerOz;

  double totalOz(Metal metal) => totalGrams(metal) / 31.1035;

  double? pricePerOzEur(Metal metal) {
    final usd = pricePerOz(metal);
    final fx = eurPerUsd;
    if (usd == null || fx == null) return null;
    return usd * fx;
  }

  double? portfolioValueEur(Metal metal) {
    final eur = pricePerOzEur(metal);
    if (eur == null) return null;
    return totalOz(metal) * eur;
  }

  double? portfolioValueUsd(Metal metal) {
    final usd = pricePerOz(metal);
    if (usd == null) return null;
    return totalOz(metal) * usd;
  }

  // ---------- krypto ----------
  Map<String, double> cryptoPricesEur = {};
  bool cryptoLoading = false;
  String cryptoDebug = '';

  Future<void> addCrypto(CryptoHolding h) async {
    cryptos.add(h);
    notifyListeners();
    await _saveCrypto();
    await loadCryptoPrices();
  }

  Future<void> updateCrypto(CryptoHolding h) async {
    final i = cryptos.indexWhere((e) => e.id == h.id);
    if (i >= 0) cryptos[i] = h;
    notifyListeners();
    await _saveCrypto();
  }

  Future<void> removeCrypto(String id) async {
    cryptos.removeWhere((e) => e.id == id);
    notifyListeners();
    await _saveCrypto();
  }

  Future<void> setCryptoQuantity(String id, double qty) async {
    final i = cryptos.indexWhere((e) => e.id == id);
    if (i < 0) return;
    cryptos[i].quantity = qty < 0 ? 0 : qty;
    notifyListeners();
    await _saveCrypto();
  }

  Future<void> loadCryptoPrices() async {
    if (cryptos.isEmpty) {
      cryptoPricesEur = {};
      cryptoDebug = '';
      notifyListeners();
      return;
    }
    cryptoLoading = true;
    notifyListeners();
    final symbols = cryptos.map((e) => e.krakenSymbol).toSet().toList();
    final results =
        await Future.wait(symbols.map((s) => PriceService.fetchKrakenEur(s)));
    final map = <String, double>{};
    final dbg = <String>[];
    for (var i = 0; i < symbols.length; i++) {
      final p = results[i];
      if (p != null && p > 0) {
        map[symbols[i]] = p;
        dbg.add('${symbols[i]}: OK');
      } else {
        dbg.add('${symbols[i]}: zlyhalo');
      }
    }
    cryptoPricesEur = map;
    cryptoDebug = dbg.join('  |  ');
    cryptoLoading = false;
    notifyListeners();
  }

  double get cryptoValueEur => cryptos.fold(
      0.0,
      (sum, h) =>
          sum + h.quantity * (cryptoPricesEur[h.krakenSymbol] ?? 0));

  /// Celkova hodnota vsetkeho v EUR
  double? get totalValueEur {
    final g = portfolioValueEur(Metal.gold);
    final s = portfolioValueEur(Metal.silver);
    if (g == null && s == null && cryptos.isEmpty) return null;
    return (g ?? 0) + (s ?? 0) + cryptoValueEur;
  }

  // ---------- zaloha / obnova ----------
  /// Exportny JSON so vsetkymi datami (neobsahuje heslo)
  String buildBackupJson() => jsonEncode({
        'app': 'portfolio',
        'version': 1,
        'items': items.map((e) => e.toJson()).toList(),
        'cryptos': cryptos.map((e) => e.toJson()).toList(),
      });

  /// Nahradi data zo zalohy. 0 = OK, 1 = zly format.
  Future<int> importBackup(String raw) async {
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      if (j['app'] != 'portfolio') return 1;
      items
        ..clear()
        ..addAll((j['items'] as List<dynamic>)
            .cast<Map<String, dynamic>>()
            .map(PortfolioItem.fromJson));
      cryptos
        ..clear()
        ..addAll((j['cryptos'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>()
            .map(CryptoHolding.fromJson));
      notifyListeners();
      await _save();
      await _saveCrypto();
      await loadCryptoPrices();
      return 0;
    } catch (_) {
      return 1;
    }
  }
}
