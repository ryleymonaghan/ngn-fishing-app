import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, DEFAULT_LOCATION } from '@constants/index';
import { useReportStore } from '@stores/index';
import type { FishingSpot, FishingReport } from '@app-types/index';

// react-native-maps doesn't support web — conditional import
let MapView: any = null;
let Marker: any = null;
let UrlTile: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    UrlTile = Maps.UrlTile;
  } catch {}
}

// ── NOAA Nautical Chart Tiles (relief/bathymetric) ──
// NOAA ENC / RNC raster chart tiles — shows depth contours, channels, markers
const NOAA_CHART_TILE_URL = 'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png';
// ESRI Ocean basemap — alternative with bathymetric shading
const ESRI_OCEAN_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';

type MapStyle = 'standard' | 'nautical' | 'ocean';

export default function SpotsScreen() {
  const { reports, activeReport } = useReportStore();
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('ocean');
  const mapRef = useRef<any>(null);

  // Gather all spots from latest report or all reports
  const latestReport = activeReport ?? reports[0];
  const allSpots: (FishingSpot & { speciesName?: string })[] = [];
  if (latestReport) {
    for (const sp of latestReport.species) {
      for (const spot of sp.spots) {
        allSpots.push({ ...spot, speciesName: sp.speciesName });
      }
    }
  }

  const openNavigation = useCallback((lat: number, lng: number, name: string) => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`).catch(() => {
        Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`);
      });
    } else if (Platform.OS === 'android') {
      Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => {
        Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`);
      });
    } else {
      Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`);
    }
  }, []);

  // ── Web fallback (no react-native-maps on web) ────
  if (Platform.OS === 'web' || !MapView) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.webContent}>
          <Text style={s.webTitle}>GPS SPOT MAP</Text>
          <Text style={s.webSub}>
            Map view is available on iOS and Android.{'\n'}
            On web, use the links below to navigate to your spots.
          </Text>
          {allSpots.length === 0 ? (
            <Text style={s.webEmpty}>
              Generate a fishing report to see GPS spots here.
            </Text>
          ) : (
            allSpots.map((spot, i) => (
              <TouchableOpacity
                key={`${spot.id}-${i}`}
                style={s.webSpotCard}
                onPress={() => openNavigation(spot.coordinates.lat, spot.coordinates.lng, spot.name)}
                activeOpacity={0.8}
              >
                <Text style={s.webSpotName}>{spot.name}</Text>
                {spot.speciesName && <Text style={s.webSpotSpecies}>{spot.speciesName}</Text>}
                {spot.depthFt && <Text style={s.webSpotDepth}>{spot.depthFt}</Text>}
                <Text style={s.webSpotCoords}>
                  {spot.coordinates.lat.toFixed(4)}, {spot.coordinates.lng.toFixed(4)}
                </Text>
                <Text style={s.webSpotNav}>Open in Google Maps →</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Native map view ────────────────────────────
  const initialRegion = allSpots.length > 0
    ? {
        latitude:       allSpots[0].coordinates.lat,
        longitude:      allSpots[0].coordinates.lng,
        latitudeDelta:  0.15,
        longitudeDelta: 0.15,
      }
    : {
        latitude:       DEFAULT_LOCATION.lat,
        longitude:      DEFAULT_LOCATION.lng,
        latitudeDelta:  0.3,
        longitudeDelta: 0.3,
      };

  return (
    <View style={s.mapContainer}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={initialRegion}
        mapType={mapStyle === 'standard' ? 'standard' : 'satellite'}
        showsUserLocation
        showsCompass
        showsScale
      >
        {/* Relief shading tile overlay */}
        {mapStyle === 'nautical' && UrlTile && (
          <UrlTile
            urlTemplate={NOAA_CHART_TILE_URL}
            maximumZ={15}
            tileSize={256}
            opacity={0.85}
          />
        )}
        {mapStyle === 'ocean' && UrlTile && (
          <UrlTile
            urlTemplate={ESRI_OCEAN_TILE_URL}
            maximumZ={16}
            tileSize={256}
            opacity={1}
          />
        )}

        {/* Fishing spot markers */}
        {allSpots.map((spot, i) => Marker && (
          <Marker
            key={`${spot.id}-${i}`}
            coordinate={{
              latitude: spot.coordinates.lat,
              longitude: spot.coordinates.lng,
            }}
            title={spot.name}
            description={`${spot.speciesName ?? ''} · ${spot.depthFt ?? ''}`}
            pinColor={COLORS.seafoam}
            onCalloutPress={() => openNavigation(
              spot.coordinates.lat, spot.coordinates.lng, spot.name
            )}
            onPress={() => setSelectedSpot(spot)}
          />
        ))}
      </MapView>

      {/* Map style toggle */}
      <View style={s.mapControls}>
        {(['ocean', 'nautical', 'standard'] as MapStyle[]).map((style) => (
          <TouchableOpacity
            key={style}
            style={[s.mapToggle, mapStyle === style && s.mapToggleActive]}
            onPress={() => setMapStyle(style)}
            activeOpacity={0.8}
          >
            <Text style={[s.mapToggleText, mapStyle === style && s.mapToggleTextActive]}>
              {style === 'ocean' ? 'OCEAN' : style === 'nautical' ? 'CHART' : 'MAP'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spot count badge */}
      <View style={s.spotCountBadge}>
        <Text style={s.spotCountText}>
          {allSpots.length} SPOT{allSpots.length !== 1 ? 'S' : ''}
        </Text>
      </View>

      {/* Selected spot detail card */}
      {selectedSpot && (
        <View style={s.spotDetail}>
          <View style={s.spotDetailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.spotDetailName}>{selectedSpot.name}</Text>
              {(selectedSpot as any).speciesName && (
                <Text style={s.spotDetailSpecies}>{(selectedSpot as any).speciesName}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedSpot(null)}>
              <Text style={s.spotDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedSpot.depthFt && (
            <Text style={s.spotDetailDepth}>Depth: {selectedSpot.depthFt}</Text>
          )}
          {selectedSpot.notes && (
            <Text style={s.spotDetailNotes}>{selectedSpot.notes}</Text>
          )}
          <TouchableOpacity
            style={s.spotDetailNav}
            onPress={() => openNavigation(
              selectedSpot.coordinates.lat,
              selectedSpot.coordinates.lng,
              selectedSpot.name
            )}
            activeOpacity={0.85}
          >
            <Text style={s.spotDetailNavText}>NAVIGATE →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {allSpots.length === 0 && (
        <View style={s.emptyOverlay}>
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>NO SPOTS YET</Text>
            <Text style={s.emptySub}>
              Generate a fishing report to see GPS spots plotted on the map with bathymetric relief shading.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060E1A' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },

  // Map controls
  mapControls: {
    position: 'absolute',
    top: 60,
    right: 12,
    flexDirection: 'column',
    gap: 4,
  },
  mapToggle: {
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: GRID_LINE,
  },
  mapToggleActive: {
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}22`,
  },
  mapToggleText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  mapToggleTextActive: {
    color: COLORS.seafoam,
  },

  // Spot count
  spotCountBadge: {
    position: 'absolute',
    top: 60,
    left: 12,
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: GRID_LINE,
  },
  spotCountText: {
    fontSize: 10,
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 1.5,
    fontWeight: '700',
  },

  // Spot detail card
  spotDetail: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
  },
  spotDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  spotDetailName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  spotDetailSpecies: {
    fontSize: 11,
    color: COLORS.seafoam,
    fontFamily: MONO,
    marginTop: 2,
  },
  spotDetailClose: {
    fontSize: 18,
    color: COLORS.textMuted,
    paddingLeft: 12,
  },
  spotDetailDepth: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginBottom: 4,
  },
  spotDetailNotes: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  spotDetailNav: {
    backgroundColor: COLORS.seafoam,
    paddingVertical: 10,
    alignItems: 'center',
  },
  spotDetailNavText: {
    fontSize: 13,
    fontWeight: '800',
    color: PANEL_BG,
    fontFamily: MONO,
    letterSpacing: 2,
  },

  // Empty state overlay
  emptyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: `${PANEL_BG}EE`,
    padding: 24,
    borderWidth: 1,
    borderColor: GRID_LINE,
    maxWidth: 280,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Web fallback
  webContent: { padding: 24, paddingBottom: 48 },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
    letterSpacing: 3,
    marginBottom: 8,
  },
  webSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  webEmpty: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  webSpotCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 8,
  },
  webSpotName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  webSpotSpecies: {
    fontSize: 11,
    color: COLORS.seafoam,
    fontFamily: MONO,
    marginTop: 2,
  },
  webSpotDepth: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },
  webSpotCoords: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 4,
  },
  webSpotNav: {
    fontSize: 12,
    color: COLORS.seafoam,
    fontFamily: MONO,
    fontWeight: '600',
    marginTop: 8,
  },
});
