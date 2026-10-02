import 'package:flutter/material.dart';
import '../state/portfolio_state.dart';

/// Ak je appka zamknuta, zobrazi heslovy dialog. Vrati true = mozes upravovat.
Future<bool> ensureUnlocked(BuildContext context, PortfolioState state) async {
  if (state.isUnlocked) return true;
  final ctrl = TextEditingController();
  var error = false;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Row(children: [
          Icon(Icons.lock_outline),
          SizedBox(width: 8),
          Text('Odomknutie úprav'),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Zadaj heslo, aby si mohol upravovať portfólio.'),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              obscureText: true,
              keyboardType: TextInputType.visiblePassword,
              decoration: InputDecoration(
                labelText: 'Heslo',
                errorText: error ? 'Nesprávne heslo' : null,
              ),
              onSubmitted: (_) async {
                final success = await state.unlock(ctrl.text);
                if (success && context.mounted) Navigator.pop(context, true);
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Zrušiť'),
          ),
          FilledButton(
            onPressed: () async {
              final success = await state.unlock(ctrl.text);
              if (success) {
                if (context.mounted) Navigator.pop(context, true);
              } else {
                setState(() => error = true);
              }
            },
            child: const Text('Odomknúť'),
          ),
        ],
      ),
    ),
  );
  return ok ?? false;
}
