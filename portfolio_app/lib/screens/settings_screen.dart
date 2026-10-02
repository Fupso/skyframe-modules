import 'dart:io';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../state/portfolio_state.dart';
import 'lock_dialog.dart';

class SettingsScreen extends StatelessWidget {
  final PortfolioState state;
  const SettingsScreen({super.key, required this.state});

  static const appVersion = '1.0.0';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nastavenia')),
      body: AnimatedBuilder(
        animation: state,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.all(12),
          children: [
            // ---------- O aplikacii ----------
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.auto_awesome,
                            color: Theme.of(context).colorScheme.primary),
                        const SizedBox(width: 8),
                        Text('Portfolio',
                            style: Theme.of(context).textTheme.titleLarge),
                        const Spacer(),
                        Text('verzia $appVersion',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text('Autor: Tomáš Fupšo'),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Text('Projekt: '),
                        Text(
                          'Rod Studio',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            // ---------- Vzhlad ----------
            Card(
              child: SwitchListTile(
                secondary: Icon(
                  Theme.of(context).brightness == Brightness.dark
                      ? Icons.dark_mode
                      : Icons.light_mode,
                ),
                title: const Text('Tmavý režim'),
                subtitle: const Text('vzhľad aplikácie'),
                value: state.themeMode == ThemeMode.dark,
                onChanged: (_) => state.toggleTheme(),
              ),
            ),
            const SizedBox(height: 12),
            // ---------- Heslo ----------
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: Icon(state.hasPassword
                        ? Icons.lock
                        : Icons.lock_open),
                    title: const Text('Heslo a šifrovanie'),
                    subtitle: Text(state.hasPassword
                        ? 'Zapnuté – dáta sú šifrované, úpravy vyžadujú heslo'
                        : 'Vypnuté – dáta nie sú chránené'),
                  ),
                  if (!state.hasPassword)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton.tonalIcon(
                          icon: const Icon(Icons.add),
                          label: const Text('Nastaviť heslo'),
                          onPressed: () => _showSetPassword(context),
                        ),
                      ),
                    ),
                  if (state.hasPassword)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: FilledButton.tonalIcon(
                              icon: const Icon(Icons.edit),
                              label: const Text('Zmeniť'),
                              onPressed: () async {
                                if (!await ensureUnlocked(context, state)) return;
                                if (context.mounted) _showSetPassword(context);
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.lock_open),
                              label: const Text('Vypnúť'),
                              onPressed: () => _confirmRemovePassword(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            // ---------- Zaloha ----------
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.backup_outlined),
                    title: const Text('Záloha dát'),
                    subtitle: const Text('Export / import všetkých položiek'),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: FilledButton.tonalIcon(
                            icon: const Icon(Icons.upload),
                            label: const Text('Export'),
                            onPressed: () => _export(context),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton.tonalIcon(
                            icon: const Icon(Icons.download),
                            label: const Text('Import'),
                            onPressed: () => _import(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSetPassword(BuildContext context) {
    final ctrl1 = TextEditingController();
    final ctrl2 = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Nastaviť heslo'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Heslo šifruje všetky dáta appky.'),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl1,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Nové heslo'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: ctrl2,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Zopakuj heslo'),
                onSubmitted: (_) => _savePassword(context, ctrl1, ctrl2, setState),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Zrušiť'),
            ),
            FilledButton(
              onPressed: () => _savePassword(context, ctrl1, ctrl2, setState),
              child: const Text('Uložiť'),
            ),
          ],
        ),
      ),
    );
  }

  void _savePassword(BuildContext context, TextEditingController c1,
      TextEditingController c2, StateSetter setState) {
    if (c1.text.length < 4) {
      _toast(context, 'Heslo musí mať aspoň 4 znaky');
      return;
    }
    if (c1.text != c2.text) {
      _toast(context, 'Heslá sa nezhodujú');
      return;
    }
    state.setPassword(c1.text);
    Navigator.pop(context);
    _toast(context, 'Heslo nastavené – dáta sú šifrované');
  }

  void _confirmRemovePassword(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Vypnúť heslo?'),
        content: const Text(
            'Dáta sa uložia nešifrovane a úpravy nebudú vyžadovať heslo.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Zrušiť'),
          ),
          FilledButton(
            onPressed: () async {
              await state.removePassword();
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Vypnúť heslo'),
          ),
        ],
      ),
    );
  }

  Future<void> _export(BuildContext context) async {
    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/portfolio_zaloha.json');
      await file.writeAsString(state.buildBackupJson());
      await Share.shareXFiles([XFile(file.path)],
          text: 'Záloha Portfolio $appVersion');
    } catch (_) {
      _toast(context, 'Export sa nepodaril');
    }
  }

  Future<void> _import(BuildContext context) async {
    final picked = await openFile(
      acceptedTypeGroups: [XTypeGroup(extensions: ['json'])],
    );
    if (picked == null) return; // pouzivatel zrusil vyber
    if (!context.mounted) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Importovať zálohu?'),
        content: const Text(
            'Súčasné dáta sa prepíšu dátami zo zálohy. Táto akcia sa nedá vrátiť.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Zrušiť'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Importovať'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final raw = await picked.readAsString();
    final result = await state.importBackup(raw);
    if (!context.mounted) return;
    _toast(context,
        result == 0 ? 'Záloha importovaná' : 'Neplatný súbor zálohy');
  }

  void _toast(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}
