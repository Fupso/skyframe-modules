import 'package:flutter/material.dart';
import '../state/portfolio_state.dart';

/// Uvodna obrazovka ak je nastavene heslo – data su zasifrovane.
class LockScreen extends StatefulWidget {
  final PortfolioState state;
  const LockScreen({super.key, required this.state});

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  final ctrl = TextEditingController();
  bool error = false;
  bool busy = false;

  Future<void> _tryUnlock() async {
    setState(() {
      busy = true;
      error = false;
    });
    final ok = await widget.state.unlock(ctrl.text);
    if (!mounted) return;
    setState(() {
      busy = false;
      error = !ok;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline,
                    size: 64, color: Theme.of(context).colorScheme.primary),
                const SizedBox(height: 16),
                Text('Portfolio je zamknuté',
                    style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(
                  'Dáta sú šifrované. Zadaj heslo pre pokračovanie.',
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: ctrl,
                  obscureText: true,
                  keyboardType: TextInputType.visiblePassword,
                  autofocus: true,
                  decoration: InputDecoration(
                    labelText: 'Heslo',
                    errorText: error ? 'Nesprávne heslo' : null,
                  ),
                  onSubmitted: (_) => _tryUnlock(),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: busy ? null : _tryUnlock,
                    icon: busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.lock_open),
                    label: Text(busy ? 'Odomykám…' : 'Odomknúť'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
