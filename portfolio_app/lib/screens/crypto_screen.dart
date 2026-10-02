import 'package:flutter/material.dart';
import '../models/crypto_holding.dart';
import '../state/portfolio_state.dart';
import 'lock_dialog.dart';

class CryptoScreen extends StatelessWidget {
  final PortfolioState state;
  const CryptoScreen({super.key, required this.state});

  String _fmt(double v) {
    var s = v.toStringAsFixed(2);
    if (v >= 1000) {
      s = v.toStringAsFixed(0);
      final buf = StringBuffer();
      for (var i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
        buf.write(s[i]);
      }
      s = '$buf';
    }
    return s;
  }

  String _fmtQty(double v) =>
      v == v.roundToDouble() ? '${v.round()}' : v.toStringAsFixed(4);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Krypto'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Obnoviť ceny',
            onPressed: () => state.loadCryptoPrices(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          if (!await ensureUnlocked(context, state)) return;
          if (context.mounted) _showCryptoEditor(context);
        },
        icon: const Icon(Icons.add),
        label: const Text('Pridať'),
      ),
      body: AnimatedBuilder(
        animation: state,
        builder: (context, _) {
          if (state.cryptos.isEmpty) {
            return const Center(
              child: Text(
                'Zatiaľ žiadne kryptomeny.\nPridaj ich tlačidlom +.',
                textAlign: TextAlign.center,
              ),
            );
          }
          final total = state.cryptoValueEur;
          return ListView(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.currency_bitcoin),
                  title: Text('Spolu: ${_fmt(total)} €'),
                  subtitle: Text(state.cryptoLoading
                      ? 'Načítavam ceny z Kraken…'
                      : (state.cryptoDebug.isEmpty
                          ? 'ceny z verejného API Kraken (EUR)'
                          : state.cryptoDebug)),
                ),
              ),
              const SizedBox(height: 8),
              for (final h in state.cryptos)
                Card(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        h.symbol.isNotEmpty ? h.symbol[0] : '?',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    title: Text('${h.name} (${h.symbol.toUpperCase()})'),
                    subtitle: Text(
                      '${_fmtQty(h.quantity)} ks · cena: ${state.cryptoPricesEur[h.krakenSymbol] != null ? '${_fmt(state.cryptoPricesEur[h.krakenSymbol]!)} €' : '—'}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${_fmt(h.quantity * (state.cryptoPricesEur[h.krakenSymbol] ?? 0))} €',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        PopupMenuButton<String>(
                          icon: const Icon(Icons.more_vert, size: 20),
                          onSelected: (v) async {
                            if (!await ensureUnlocked(context, state)) return;
                            if (v == 'edit') {
                              _showCryptoEditor(context, existing: h);
                            } else if (v == 'qty') {
                              _showQtyEditor(context, h);
                            } else if (v == 'delete') {
                              await state.removeCrypto(h.id);
                            }
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem(value: 'qty', child: Text('Zmeniť množstvo')),
                            PopupMenuItem(value: 'edit', child: Text('Upraviť')),
                            PopupMenuItem(value: 'delete', child: Text('Zmazať')),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  void _showQtyEditor(BuildContext context, CryptoHolding h) {
    final ctrl = TextEditingController(text: '${h.quantity}');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Množstvo ${h.symbol.toUpperCase()}'),
        content: TextField(
          controller: ctrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Množstvo', hintText: 'napr. 0.5'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Zrušiť'),
          ),
          FilledButton(
            onPressed: () async {
              final q = double.tryParse(ctrl.text.replaceAll(',', '.'));
              if (q != null && q >= 0) {
                await state.setCryptoQuantity(h.id, q);
              }
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Uložiť'),
          ),
        ],
      ),
    );
  }

  void _showCryptoEditor(BuildContext context, {CryptoHolding? existing}) {
    final symCtrl =
        TextEditingController(text: existing?.symbol.toUpperCase() ?? '');
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final qtyCtrl = TextEditingController(
        text: existing != null ? '${existing.quantity}' : '');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(existing == null ? 'Pridať kryptomenu' : 'Upraviť kryptomenu'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: symCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'Symbol',
                hintText: 'napr. BTC, ETH, SOL',
              ),
            ),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Názov',
                hintText: 'napr. Bitcoin',
              ),
            ),
            TextField(
              controller: qtyCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Množstvo'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Zrušiť'),
          ),
          FilledButton(
            onPressed: () async {
              final symbol = symCtrl.text.trim().toUpperCase();
              final qty = double.tryParse(qtyCtrl.text.replaceAll(',', '.')) ?? 0;
              if (symbol.isEmpty) return;
              if (existing == null) {
                await state.addCrypto(CryptoHolding(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  symbol: symbol,
                  name: nameCtrl.text.trim().isEmpty ? symbol : nameCtrl.text.trim(),
                  quantity: qty,
                ));
              } else {
                await state.updateCrypto(CryptoHolding(
                  id: existing.id,
                  symbol: symbol,
                  name: nameCtrl.text.trim(),
                  quantity: qty,
                ));
                await state.loadCryptoPrices();
              }
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Uložiť'),
          ),
        ],
      ),
    );
  }
}
