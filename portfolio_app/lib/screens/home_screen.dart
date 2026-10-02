import 'package:flutter/material.dart';
import '../models/portfolio_item.dart';
import '../state/portfolio_state.dart';
import 'crypto_screen.dart';
import 'settings_screen.dart';
import 'items_screen.dart';
import 'summary_screen.dart';

class HomeScreen extends StatelessWidget {
  final PortfolioState state;
  const HomeScreen({super.key, required this.state});

  String _fmt(double v) => v.toStringAsFixed(2);

  String _fmtMoney(double v) {
    final s = v.toStringAsFixed(2);
    final parts = s.split('.');
    final grouped = parts[0].replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => '${m[0]},');
    return grouped.replaceAll(',', ' ');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: const Text('Moje portfolio'),
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
      drawer: _buildDrawer(context, isDark),
      body: AnimatedBuilder(
        animation: state,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.all(12),
          children: [
            _totalCard(context),
            const SizedBox(height: 12),
            _metalCard(context, Metal.gold, 'Zlato', const Color(0xFFD4AF37), Icons.workspace_premium),
            const SizedBox(height: 12),
            _metalCard(context, Metal.silver, 'Striebro', const Color(0xFFB0B7BF), Icons.shield_outlined),
            const SizedBox(height: 12),
            _cryptoCard(context),
          ],
        ),
      ),
      ),
    );
  }

  /// Postranne menu (drawer)
  Widget _buildDrawer(BuildContext context, bool isDark) {
    final total = state.totalValueEur;
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Icon(Icons.account_balance_wallet_outlined, size: 36),
                const SizedBox(height: 8),
                Text('Portfolio',
                    style: Theme.of(context).textTheme.titleLarge),
                Text(
                  total != null ? '${_fmtMoney(total)} €' : 'Hodnota portfólia',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.summarize_outlined),
            title: const Text('Prehľad portfólia'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => SummaryScreen(state: state)),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Nastavenia'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => SettingsScreen(state: state)),
              );
            },
          ),
          const Divider(),
          SwitchListTile(
            secondary: Icon(isDark ? Icons.dark_mode : Icons.light_mode),
            title: const Text('Tmavý režim'),
            value: isDark,
            onChanged: (_) => state.toggleTheme(),
          ),
          ListTile(
            leading: const Icon(Icons.refresh),
            title: const Text('Obnoviť ceny'),
            onTap: () {
              state.loadPrices();
              state.loadCryptoPrices();
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  /// Velka karta s aktualnou hodnotou celeho portfolia
  Widget _totalCard(BuildContext context) {
    final total = state.totalValueEur;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined,
                    color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Aktuálna hodnota portfólia',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              total != null ? '${_fmtMoney(total)} €' : '—',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            if (state.pricesLoading || state.cryptoLoading)
              Text(
                'načítavam ceny…',
                style: Theme.of(context).textTheme.bodySmall,
              )
            else if (total != null)
              Text(
                'zlato + striebro (spot) + krypto · ↻ obnoviť',
                style: Theme.of(context).textTheme.bodySmall,
              ),
          ],
        ),
      ),
    );
  }

  Widget _cryptoCard(BuildContext context) {
    final value = state.cryptoValueEur;
    final count = state.cryptos.length;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.orange.withOpacity(0.2),
          child: const Icon(Icons.currency_bitcoin, color: Colors.orange),
        ),
        title: Text('Krypto', style: Theme.of(context).textTheme.titleLarge),
        subtitle: Text(count == 0
            ? 'zatiaľ prázdne'
            : '$count druhov · ${_fmt(value)} €'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => CryptoScreen(state: state)),
        ),
      ),
    );
  }

  Widget _metalCard(BuildContext context, Metal metal, String title, Color color, IconData icon) {
    final grams = state.totalGrams(metal);
    final pieces = state.totalPieces(metal);
    final priceEur = state.pricePerOzEur(metal);
    final priceUsd = state.pricePerOz(metal);
    final symbol = metal == Metal.gold ? 'XAU' : 'XAG';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        leading: CircleAvatar(backgroundColor: color.withOpacity(0.25), child: Icon(icon, color: color)),
        title: Text(title, style: Theme.of(context).textTheme.titleLarge),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$pieces ks · ${grams.toStringAsFixed(1)} g'),
            const SizedBox(height: 2),
            if (priceEur != null) ...[
              Text(
                '$symbol: ${_fmt(priceEur)} €/oz · ${_fmt(priceUsd!)} \$/oz',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
              if (state.portfolioValueEur(metal) != null)
                Text(
                  'hodnota: ${_fmtMoney(state.portfolioValueEur(metal)!)} €',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
            ]
            else
              Text(
                state.pricesLoading
                    ? 'Načítavam cenu…'
                    : 'Cena nedostupná (↻ obnoviť)\n${state.priceDebug}',
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        children: [
          ListTile(
            leading: const Icon(Icons.monetization_on_outlined),
            title: const Text('Mince'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ItemsScreen(state: state, metal: metal, category: ItemCategory.coin),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.inventory_2_outlined),
            title: const Text('Tehličky'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ItemsScreen(state: state, metal: metal, category: ItemCategory.bar),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
