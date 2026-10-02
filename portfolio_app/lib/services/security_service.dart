import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as enc;

/// Sifrovanie dat appky + hash hesla.
/// Kluc = SHA-256 hesla, AES-256-CBC s nahodnym IV.
class SecurityService {
  static String hashPassword(String password) =>
      sha256.convert(utf8.encode(password)).toString();

  static enc.Key _keyFromPassword(String password) =>
      enc.Key(Uint8List.fromList(sha256.convert(utf8.encode(password)).bytes));

  /// Zasifruje text. Vracia JSON string {"iv":..., "data":...}
  static String encrypt(String plain, String password) {
    final iv = enc.IV.fromSecureRandom(16);
    final encrypter =
        enc.Encrypter(enc.AES(_keyFromPassword(password), mode: enc.AESMode.cbc));
    final cipher = encrypter.encrypt(plain, iv: iv);
    return jsonEncode({'iv': iv.base64, 'data': cipher.base64});
  }

  /// Desifruje payload z [encrypt]. null = zle heslo alebo poskodene data.
  static String? decrypt(String payload, String password) {
    try {
      final j = jsonDecode(payload) as Map<String, dynamic>;
      final iv = enc.IV.fromBase64(j['iv'] as String);
      final encrypter = enc.Encrypter(
          enc.AES(_keyFromPassword(password), mode: enc.AESMode.cbc));
      return encrypter.decrypt(enc.Encrypted.fromBase64(j['data'] as String),
          iv: iv);
    } catch (_) {
      return null;
    }
  }

  /// Detekuje, ci je string zasifrovany (odlisujeme od stareho plain JSONu)
  static bool looksEncrypted(String payload) {
    try {
      final j = jsonDecode(payload);
      return j is Map<String, dynamic> &&
          j.containsKey('iv') &&
          j.containsKey('data');
    } catch (_) {
      return false;
    }
  }
}
