import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, DEFAULT_LOCATION } from '@constants/index';
import { useReportStore, useAuthStore } from '@stores/index';
import { startCheckout } from '@services/stripeService';
import type { FishingSpot } from '@app-types/index';

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

// ── Tile Layer URLs ──────────────────────────────
const NOAA_CHART_TILE_URL = 'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png';
const ESRI_OCEAN_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_OCEAN_REF_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}';

// ── Layer definitions ────────────────────────────
interface MapLayer {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  proOnly: boolean;
}

const MAP_LAYERS: MapLayer[] = [
  { id: 'satellite',  label: 'Satellite',        shortLabel: 'SAT',   description: 'Standard satellite imagery',               proOnly: false },
  { id: 'ocean',      label: 'Ocean Relief',      shortLabel: 'OCEAN', description: 'ESRI bathymetric shading + depth colors',   proOnly: true  },
  { id: 'nautical',   label: 'Nautical Chart',    shortLabel: 'CHART', description: 'NOAA nautical chart — channels, markers, depths', proOnly: true  },
  { id: 'labels',     label: 'Ocean Labels',      shortLabel: 'LABEL', description: 'Place names, ocean features, reef labels',  proOnly: true  },
];

type BaseMap = 'satellite' | 'ocean';

export default function SpotsScreen() {
  const { reports, activeReport } = useReportStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMap>('satellite');
  const [showNautical, setShowNautical] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const mapRef = useRef<any>(null);

  const isPro = user?.subscription?.isActive ?? false;

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

  const handleProLayerTap = useCallback((layerId: string) => {
    if (isPro) {
      // Toggle the layer
      if (layerId === 'ocean')    setBaseMap((prev) => prev === 'ocean' ? 'satellite' : 'ocean');
      if (layerId === 'nautical') setShowNautical((prev) => !prev);
      if (layerId === 'labels')   setShowLabels((prev) => !prev);
    } else {
      // Show upgrade prompt
      Alert.alert(
        'Pro Feature — Relief Shading',
        'Unlock ESRI Ocean Relief, NOAA Nautical Charts, and depth contours with NGN Pro.\n\n$9.99/mo or $59.99/yr',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Upgrade to Pro',
            onPress: () => startCheckout('monthly', user?.email),
          },
        ]
      );
    }
  }, [isPro, user?.email]);

  // ── Web fallback (no react-native-maps on web) ────
  if (Platform.OS === 'web' || !MapView) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.webContent}>
          <Text style={s.webTitle}>GPS SPOT MAP</Text>
          <Text style={s.webSub}>
            Map view with relief shading is available on iOS and Android.{'\n'}
            On web, use the links below to navigate to your spots.
          </Text>

          {/* Web layer info */}
          <View style={s.webProBanner}>
            <Text style={s.webProTitle}>PRO MAP LAYERS</Text>
            <Text style={s.webProDesc}>
              Upgrade to Pro to unlock ESRI Ocean Relief, NOAA Nautical Charts, and depth contours on mobile.
            </Text>
            {!isPro && (
              <TouchableOpacity
                style={s.webProBtn}
                onPress={() => startCheckout('monthly', user?.email)}
                activeOpacity={0.85}
              >
                <Text style={s.webProBtnText}>UPGRADE — $9.99/MO</Text>
              </TouchableOpacity>
            )}
          </View>

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

  const isLayerActive = (id: string) => {
    if (id === 'satellite') return baseMap === 'satellite';
    if (id === 'ocean')     return baseMap === 'ocean';
    if (id === 'nautical')  return showNautical;
    if (id === 'labels')    return showLabels;
    return false;
  };

  return (
    <View style={s.mapContainer}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={initialRegion}
        mapType={baseMap === 'ocean' ? 'satellite' : 'standard'}
        showsUserLocation
        showsCompass
        showsScale
      >
        {/* ESRI Ocean Relief basemap (Pro) */}
        {baseMap === 'ocean' && isPro && UrlTile && (
          <UrlTile
            urlTemplate={ESRI_OCEAN_TILE_URL}
            maximumZ={16}
            tileSize={256}
            opacity={1}
            zIndex={1}
          />
        )}

        {/* NOAA Nautical Chart overlay (Pro, toggleable) */}
        {showNautical && isPro && UrlTile && (
          <UrlTile
            urlTemplate={NOAA_CHART_TILE_URL}
            maximumZ={15}
            tileSize={256}
            opacity={0.75}
            zIndex={2}
          />
        )}

        {/* ESRI Ocean Reference / Labels overlay (Pro, toggleable) */}
        {showLabels && isPro && UrlTile && (
          <UrlTile
            urlTemplate={ESRI_OCEAN_REF_URL}
            maximumZ={16}
            tileSize={256}
            opacity={0.9}
            zIndex={3}
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

      {/* ── Layer Control Panel Toggle ─────────── */}
      <TouchableOpacity
        style={s.layerToggleBtn}
        onPress={() => setShowLayerPanel((p) => !p)}
        activeOpacity={0.8}
      >
        <Text style={s.layerToggleIcon}>◫</Text>
        <Text style={s.layerToggleText}>LAYERS</Text>
      </TouchableOpacity>

      {/* ── Layer Control Panel ────────────────── */}
      {showLayerPanel && (
        <View style={s.layerPanel}>
          <Text style={s.layerPanelTitle}>MAP LAYERS</Text>
          {MAP_LAYERS.map((layer) => {
            const active = isLayerActive(layer.id);
            const locked = layer.proOnly && !isPro;
            return (
              <TouchableOpacity
                key={layer.id}
                style={[s.layerRow, active && s.layerRowActive]}
                onPress={() => {
                  if (layer.id === 'satellite') {
                    setBaseMap('satellite');
                  } else {
                    handleProLayerTap(layer.id);
                  }
                }}
                activeOpacity={0.75}
              >
                <View style={s.layerInfo}>
                  <View style={s.layerNameRow}>
                    <Text style={[s.layerName, active && s.layerNameActive]}>
                      {layer.shortLabel}
                    </Text>
                    {locked && (
                      <View style={s.proBadge}>
                        <Text style={s.proBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.layerDesc}>{layer.description}</Text>
                </View>
                <View style={[s.layerCheck, active && s.layerCheckActive]}>
                  {active && <Text style={s.layerCheckMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}

          {!isPro && (
            <TouchableOpacity
              style={s.layerUpgradeBtn}
              onPress={() => startCheckout('monthly', user?.email)}
              activeOpacity={0.85}
            >
              <Text style={s.layerUpgradeText}>UNLOCK ALL LAYERS — $9.99/MO</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Spot count badge */}
      <View style={s.spotCountBadge}>
        <Text style={s.spotCountText}>
          {allSpots.length} SPOT{allSpots.length !== 1 ? 'S' : ''}
        </Text>
      </View>

      {/* Active layers indicator */}
      {isPro && (baseMap === 'ocean' || showNautical || showLabels) && (
        <View style={s.activeLayersBadge}>
          <Text style={s.activeLayersText}>
            {[
              baseMap === 'ocean' ? 'RELIEF' : null,
              showNautical ? 'CHART' : null,
              showLabels ? 'LABELS' : null,
            ].filter(Boolean).join(' + ')}
          </Text>
        </View>
      )}

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
              Generate a fishing report to see GPS spots plotted on the map with relief shading.
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

  // ── Layer Toggle Button ──────────────
  layerToggleBtn: {
    position: 'absolute',
    top: 60,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    gap: 6,
  },
  layerToggleIcon: {
    fontSize: 14,
    color: COLORS.seafoam,
  },
  layerToggleText: {
    fontSize: 9,
    color: COLORS.seafoam,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── Layer Control Panel ──────────────
  layerPanel: {
    position: 'absolute',
    top: 100,
    right: 12,
    width: 260,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 12,
  },
  layerPanelTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 10,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  layerRowActive: {
    borderColor: `${COLORS.seafoam}44`,
    backgroundColor: `${COLORS.seafoam}0A`,
  },
  layerInfo: { flex: 1, marginRight: 10 },
  layerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  layerName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  layerNameActive: {
    color: COLORS.seafoam,
  },
  layerDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 13,
  },
  proBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  proBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  layerCheck: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: GRID_LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerCheckActive: {
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}22`,
  },
  layerCheckMark: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.seafoam,
  },
  layerUpgradeBtn: {
    backgroundColor: COLORS.seafoam,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  layerUpgradeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },

  // ── Spot count ──────────────────────
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

  // ── Active layers indicator ─────────
  activeLayersBadge: {
    position: 'absolute',
    top: 60,
    left: 100,
    backgroundColor: `${COLORS.seafoam}22`,
    borderWidth: 1,
    borderColor: `${COLORS.seafoam}44`,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  activeLayersText: {
    fontSize: 8,
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // ── Spot detail card ───────────────
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

  // ── Empty state overlay ────────────
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

  // ── Web fallback ───────────────────
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
    marginBottom: 16,
    lineHeight: 20,
  },
  webProBanner: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.warning,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  webProTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.warning,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 6,
  },
  webProDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  webProBtn: {
    backgroundColor: COLORS.seafoam,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  webProBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1.5,
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
