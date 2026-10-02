import 'package:flutter/material.dart';
import '../models/portfolio_item.dart';
import '../state/portfolio_state.dart';

class SummaryScreen extends StatelessWidget {
  final PortfolioState state;
  const SummaryScreen({super.key, required this.state});

  String _fmt(double v) {
    final s = v.toStringAsFixed(2);
    final parts = s.split('.');
    final intPart = parts[0].replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => '${m[0]},');
    return intPart.replaceAll(',', ' ');
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Súhrn portfólia'),
          bottom: const TabBar(tabs: [
            Tab(text: 'Zlato'),
            Tab(text: 'Striebro'),
            Tab(text: 'Krypto'),
          ]),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Obnoviť ceny',
              onPressed: () {
                state.loadPrices();
                state.loadCryptoPrices();
              },
            ),
          ],
        ),
        body: AnimatedBuilder(
          animation: state,
          builder: (context, _) => TabBarView(
            children: [
              _buildList(context, Metal.gold),
              _buildList(context, Metal.silver),
              _buildCrypto(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCrypto(BuildContext context) {
    if (state.cryptos.isEmpty) {
      return const Center(child: Text('Zatiaľ nemáš žiadne kryptomeny.'));
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Card(
            child: ListTile(
              leading: const Icon(Icons.currency_bitcoin),
              title: Text('Spolu: ${_fmt(state.cryptoValueEur)} €'),
              subtitle: Text(state.cryptoLoading
                  ? 'Načítavam ceny z Kraken…'
                  : 'ceny z verejného API Kraken (EUR)'),
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: state.cryptos.length,
            itemBuilder: (context, i) {
              final h = state.cryptos[i];
              final price = state.cryptoPricesEur[h.krakenSymbol];
              return Card(
                child: ListTile(
                  title: Text('${h.name} (${h.symbol.toUpperCase()})'),
                  subtitle: Text(
                    '${h.quantity} ks · cena: ${price != null ? '${_fmt(price)} €' : '—'}',
                  ),
                  trailing: Text(
                    '${_fmt(h.quantity * (price ?? 0))} €',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildList(BuildContext context, Metal metal) {
    final items =
        state.items.where((e) => e.metal == metal && e.quantity > 0).toList();
    final grams = state.totalGrams(metal);
    final pieces = state.totalPieces(metal);
    final priceEur = state.pricePerOzEur(metal);
    final priceUsd = state.pricePerOz(metal);
    final valueEur = state.portfolioValueEur(metal);
    final symbol = metal == Metal.gold ? 'XAU' : 'XAG';

    if (items.isEmpty) {
      return const Center(child: Text('Zatiaľ nemáš žiadne položky.'));
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Card(
            child: ListTile(
              leading: const Icon(Icons.scale_outlined),
              title: Text('Spolu: $pieces ks'),
              subtitle: Text(
                '${grams.toStringAsFixed(1)} g čistého kovu'
                '${valueEur != null ? '\n≈ ${_fmt(valueEur)} € (spot)' : ''}',
              ),
              isThreeLine: valueEur != null,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Icon(Icons.price_change_outlined,
                  size: 16, color: Theme.of(context).hintColor),
              const SizedBox(width: 6),
              Text(
                priceEur != null
                    ? '$symbol: ${_fmt(priceEur)} €/oz · ${_fmt(priceUsd!)} \$/oz · kurz ECB'
                    : (state.pricesLoading ? 'Načítavam cenu…' : 'Cena sa nepodarila načítať (offline?)'),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: items.length,
            itemBuilder: (context, i) {
              final it = items[i];
              return Card(
                child: ListTile(
                  title: Text(it.name),
                  subtitle: Text('${it.manufacturer} · ${it.weightLabel}'),
                  trailing: Text('${it.quantity} ks',
                      style: Theme.of(context).textTheme.titleMedium),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
