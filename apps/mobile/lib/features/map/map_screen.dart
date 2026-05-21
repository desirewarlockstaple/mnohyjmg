import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../api/client.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  int _day = 0;
  // Tile that always includes Taiwan (z=5, x=26, y=14). Good enough as a
  // lightweight preview without pulling in a full MapLibre dependency.
  static const int _z = 5;
  static const int _x = 26;
  static const int _y = 14;

  @override
  Widget build(BuildContext context) {
    final url = '$defaultApiUrl/tiles/$_z/$_x/$_y.png?day=$_day';
    return Scaffold(
      appBar: AppBar(title: const Text('Forecast map')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Text('D + $_day'),
                Expanded(
                  child: Slider(
                    value: _day.toDouble(),
                    min: 0,
                    max: 13,
                    divisions: 13,
                    onChanged: (v) => setState(() => _day = v.toInt()),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: 1,
                child: Container(
                  color: const Color(0xFF0F2A44),
                  child: CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    placeholder: (_, __) =>
                        const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    errorWidget: (_, __, ___) => const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Text(
                          'Tile API unavailable.\nFull interactive map: tideguard.app/map',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white70),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Forecast tile for the Taiwan Strait. Drag the slider for a 14-day horizon.',
              style: TextStyle(color: Colors.black54),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}
