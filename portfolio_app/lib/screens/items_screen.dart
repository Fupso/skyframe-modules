import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/portfolio_item.dart';
import '../state/portfolio_state.dart';
import 'lock_dialog.dart';

class ItemsScreen extends StatelessWidget {
  final PortfolioState state;
  final Metal metal;
  final ItemCategory category;

  const ItemsScreen({super.key, required this.state, required this.metal, required this.category});

  String get _title {
    final m = metal == Metal.gold ? 'Zlato' : 'Striebro';
    final c = category == ItemCategory.coin ? 'mince' : 'tehličky';
    return '$m – $c';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          if (!await ensureUnlocked(context, state)) return;
          if (context.mounted) showItemEditor(context, state, metal, category);
        },
        icon: const Icon(Icons.add),
        label: const Text('Pridať'),
      ),
      body: AnimatedBuilder(
        animation: state,
        builder: (context, _) {
          final sections = state.sectionsByWeight(metal, category);
          if (sections.isEmpty) {
            return const Center(
              child: Text('Zatiaľ nič nemáš.\nPridaj položku tlačidlom +.', textAlign: TextAlign.center),
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
            children: [
              for (final entry in sections.entries) ...[
                _sectionHeader(context, entry.value.first),
                for (final it in entry.value) _itemRow(context, it),
                const SizedBox(height: 14),
              ],
            ],
          );
        },
      ),
    );
  }

  // Hlavicka hmotnostnej sekcie, napr. "1 oz"
  Widget _sectionHeader(BuildContext context, PortfolioItem first) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 6, 4, 2),
      child: Row(
        children: [
          Text(
            first.weightLabel,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
          const Spacer(),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add_circle_outline),
            tooltip: 'Pridať do ${first.weightLabel}',
            onPressed: () async {
              if (!await ensureUnlocked(context, state)) return;
              if (context.mounted) {
                showItemEditor(context, state, metal, category,
                    presetWeight: first.weightOz, presetGrams: first.inGrams);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _itemRow(BuildContext context, PortfolioItem it) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            _itemImage(it), // velky obrazok 64x64
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    it.name,
                    style: Theme.of(context).textTheme.titleSmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${it.manufacturer} · ${it.quantity} ks',
                    style: Theme.of(context).textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            _quantityStepper(context, it),
            PopupMenuButton<String>(
              padding: EdgeInsets.zero,
              icon: const Icon(Icons.more_vert, size: 20),
              onSelected: (v) async {
                if (!await ensureUnlocked(context, state)) return;
                if (v == 'edit') {
                  if (context.mounted) {
                    await showItemEditor(context, state, metal, category, existing: it);
                  }
                } else if (v == 'delete') {
                  await state.removeItem(it.id);
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'edit', child: Text('Upraviť')),
                PopupMenuItem(value: 'delete', child: Text('Zmazať')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _quantityStepper(BuildContext context, PortfolioItem it) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.withOpacity(0.4)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.remove, size: 18),
            onPressed: () async {
              if (!await ensureUnlocked(context, state)) return;
              await state.changeQuantity(it.id, -1);
            },
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Text('${it.quantity}', style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add, size: 18),
            onPressed: () async {
              if (!await ensureUnlocked(context, state)) return;
              await state.changeQuantity(it.id, 1);
            },
          ),
        ],
      ),
    );
  }

  Widget _itemImage(PortfolioItem it) {
    if (it.imagePath != null && File(it.imagePath!).existsSync()) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.file(
          File(it.imagePath!),
          width: 64,
          height: 64,
          fit: BoxFit.cover,
        ),
      );
    }
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Icon(Icons.image_outlined, size: 30),
    );
  }
}

/// Vaha: podporuje desatinnu ciarku/bodku aj zlomky, napr. "1/10"
double? parseWeightInput(String raw) {
  final s = raw.trim().replaceAll(',', '.');
  if (s.contains('/')) {
    final parts = s.split('/');
    if (parts.length == 2) {
      final a = double.tryParse(parts[0].trim());
      final b = double.tryParse(parts[1].trim());
      if (a != null && b != null && b != 0) return a / b;
    }
    return null;
  }
  return double.tryParse(s);
}

/// Dialóg na pridanie / úpravu položky (s voľbou jednotky oz/g)
Future<void> showItemEditor(
  BuildContext context,
  PortfolioState state,
  Metal metal,
  ItemCategory category, {
  PortfolioItem? existing,
  double? presetWeight,
  bool? presetGrams,
}) async {
  final nameCtrl = TextEditingController(text: existing?.name ?? '');
  final makerCtrl = TextEditingController(text: existing?.manufacturer ?? '');
  final weightCtrl = TextEditingController(
    text: existing != null
        ? existing.weightOz.toString()
        : (presetWeight?.toString() ?? ''),
  );
  var inGrams = existing?.inGrams ?? presetGrams ?? false;
  String? imagePath = existing?.imagePath;

  await showDialog(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: Text(existing == null ? 'Pridať položku' : 'Upraviť položku'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              GestureDetector(
                onTap: () async {
                  final picked = await ImagePicker().pickImage(
                    source: ImageSource.gallery,
                    imageQuality: 80,
                    maxWidth: 1200,
                  );
                  if (picked != null) setState(() => imagePath = picked.path);
                },
                child: Container(
                  height: 120,
                  width: 120,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.withOpacity(0.5)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: imagePath != null && File(imagePath!).existsSync()
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.file(File(imagePath!), fit: BoxFit.cover),
                        )
                      : const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_a_photo_outlined, size: 32),
                            SizedBox(height: 4),
                            Text('Pridať foto', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Názov', hintText: 'napr. Philharmoniker'),
              ),
              TextField(
                controller: makerCtrl,
                decoration: const InputDecoration(labelText: 'Výrobca', hintText: 'napr. Münze Österreich'),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: weightCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Váha',
                        hintText: 'napr. 1 alebo 0,1',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: DropdownButtonFormField<bool>(
                      initialValue: inGrams,
                      decoration: const InputDecoration(labelText: 'Jednotka'),
                      items: const [
                        DropdownMenuItem(value: false, child: Text('oz')),
                        DropdownMenuItem(value: true, child: Text('g')),
                      ],
                      onChanged: (v) => setState(() => inGrams = v ?? false),
                    ),
                  ),
                ],
              ),
              // Zlomkove unce – jednym ťukom, bez lomítka na klávesnici
              if (!inGrams) ...[
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Zlomkové unce:',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 8,
                  runSpacing: -8,
                  children: [
                    for (final f in const {
                      '1/25': 0.04,
                      '1/20': 0.05,
                      '1/10': 0.1,
                      '1/4': 0.25,
                      '1/2': 0.5,
                    }.entries)
                      ActionChip(
                        label: Text(f.key),
                        onPressed: () => weightCtrl.text = f.value.toString(),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Zrušiť'),
          ),
          FilledButton(
            onPressed: () async {
              final weight = parseWeightInput(weightCtrl.text);
              if (nameCtrl.text.trim().isEmpty || weight == null || weight <= 0) return;
              if (existing == null) {
                await state.addItem(PortfolioItem(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  metal: metal,
                  category: category,
                  name: nameCtrl.text.trim(),
                  manufacturer: makerCtrl.text.trim(),
                  weightOz: weight,
                  inGrams: inGrams,
                  imagePath: imagePath,
                ));
              } else {
                await state.updateItem(PortfolioItem(
                  id: existing.id,
                  metal: metal,
                  category: category,
                  name: nameCtrl.text.trim(),
                  manufacturer: makerCtrl.text.trim(),
                  weightOz: weight,
                  inGrams: inGrams,
                  imagePath: imagePath,
                  quantity: existing.quantity,
                ));
              }
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Uložiť'),
          ),
        ],
      ),
    ),
  );
}
