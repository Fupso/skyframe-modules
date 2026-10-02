import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/lock_screen.dart';
import 'state/portfolio_state.dart';

void main() {
  runApp(const PortfolioApp());
}

class PortfolioApp extends StatefulWidget {
  const PortfolioApp({super.key});

  @override
  State<PortfolioApp> createState() => _PortfolioAppState();
}

class _PortfolioAppState extends State<PortfolioApp> {
  final PortfolioState state = PortfolioState();

  @override
  void initState() {
    super.initState();
    // najprv sa nacitaju ulozene data, AZ POTOM ceny (inak appka
    // skusa tahat ceny pre prazdny zoznam a ukazuje nuly)
    state.load().then((_) {
      state.loadPrices(); // ceny zlata/striebra
      state.loadCryptoPrices(); // ceny kryptomien z Kraken
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) {
        final scheme = ColorScheme.fromSeed(
          seedColor: const Color(0xFFD4AF37),
        );
        return MaterialApp(
          title: 'Portfolio',
          debugShowCheckedModeBanner: false,
          themeMode: state.themeMode,
          theme: ThemeData(
            colorScheme: scheme,
            useMaterial3: true,
          ),
          darkTheme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFFD4AF37),
              brightness: Brightness.dark,
            ),
            useMaterial3: true,
          ),
          home: state.requiresPassword && !state.isUnlocked
              ? LockScreen(state: state)
              : HomeScreen(state: state),
        );
      },
    );
  }
}
