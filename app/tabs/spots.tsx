import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Platform, ScrollView, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, DEFAULT_LOCATION, OFFSHORE_SPECIES, PRICING } from '@constants/index';
import { useReportStore, useAuthStore, useConditionsStore } from '@stores/index';
import { startCheckout } from '@services/stripeService';
import { scoutNearbyStructure, type ScoutResult } from '@services/scoutService';
import {
  isCastTrackerAvailable,
  startCastTracking,
  stopCastTracking,
  updateAnglerPosition,
  setTackleWeight,
  bearingToCardinal,
  isCastStale,
} from '@services/castTrackerService';
import { TACKLE_WEIGHTS, type CastEstimate } from '@constants/castTracker';
import type { FishingSpot } from '@app-types/index';
import { clusterReportSpots } from '@services/clusterService';
import { getWaypointInfo, sortSpotsByDistance, type WaypointInfo } from '@services/waypointNavService';

// react-native-maps doesn't support web — conditional import
let MapView: any = null;
let Marker: any = null;
let UrlTile: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    UrlTile = Maps.UrlTile;
    Polyline = Maps.Polyline;
  } catch {}
}

// ── Tile Layer URLs ──────────────────────────────
const NOAA_CHART_TILE_URL = 'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png';
const ESRI_OCEAN_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_OCEAN_REF_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}';
const NOAA_ENC_TILE_URL   = 'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/tile/{z}/{y}/{x}';
const OPENSEAMAP_TILE_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';

// ── Layer definitions ────────────────────────────
// anglerOnly = true → requires Pro Angler tier ($19.99/mo)
// anglerOnly = false → available to all tiers (including Free)
interface MapLayer {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  anglerOnly: boolean;
}

const MAP_LAYERS: MapLayer[] = [
  { id: 'satellite',  label: 'Satellite',         shortLabel: 'SAT',    description: 'Standard satellite imagery',               anglerOnly: false },
  { id: 'ocean',      label: 'Ocean Relief',       shortLabel: 'OCEAN',  description: 'ESRI bathymetric shading + depth colors',   anglerOnly: true  },
  { id: 'depthchart', label: 'Depth Contours',     shortLabel: 'DEPTH',  description: 'NOAA ENC — depth soundings, contours, ledges', anglerOnly: true  },
  { id: 'nautical',   label: 'Nautical Chart',     shortLabel: 'CHART',  description: 'NOAA nautical chart — channels, markers, depths', anglerOnly: true  },
  { id: 'seamarks',   label: 'Sea Marks',          shortLabel: 'MARKS',  description: 'Buoys, beacons, aids to navigation',       anglerOnly: true  },
  { id: 'labels',     label: 'Ocean Labels',       shortLabel: 'LABEL',  description: 'Place names, ocean features, reef labels',  anglerOnly: true  },
];

type BaseMap = 'satellite' | 'ocean';

export default function SpotsScreen() {
  const { reports, activeReport } = useReportStore();
  const { user } = useAuthStore();
  const { conditions } = useConditionsStore();
  const router = useRouter();
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMap>('satellite');
  const [showNautical, setShowNautical] = useState(false);
  const [showDepthChart, setShowDepthChart] = useState(false);
  const [showSeamarks, setShowSeamarks] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const mapRef = useRef<any>(null);

  // ── Pin & Scout state ─────────────────────
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [scoutResults, setScoutResults] = useState<ScoutResult[] | null>(null);
  const [scouting, setScouting] = useState(false);
  const [selectedScout, setSelectedScout] = useState<ScoutResult | null>(null);

  // ── Cast Tracker state ─────────────────
  const [castTracking, setCastTracking] = useState(false);
  const [activeCast, setActiveCast] = useState<CastEstimate | null>(null);
  const [castHistory, setCastHistory] = useState<CastEstimate[]>([]);
  const [selectedTackle, setSelectedTackle] = useState('medium');
  const [showTackleSelect, setShowTackleSelect] = useState(false);
  const castAvailable = isCastTrackerAvailable();

  // ── Waypoint Navigation state ─────────────
  const [navActive, setNavActive] = useState(false);
  const [navTargetIdx, setNavTargetIdx] = useState(0);
  const [navInfo, setNavInfo] = useState<WaypointInfo | null>(null);

  // Feature gating: Pro gets basic map + GPS, Pro Angler gets all layers
  const userTier = user?.subscription?.tier ?? 'free';
  const isPro = user?.subscription?.isActive ?? false;  // any paid tier
  const isAnglerTier = userTier === 'angler_monthly' || userTier === 'angler_annual';

  // Gather all spots from latest report, then cluster them (6–8 per prime location)
  const latestReport = activeReport ?? reports[0];
  const allSpots = useMemo(() => {
    const spots: (FishingSpot & { speciesName?: string })[] = [];
    if (latestReport) {
      for (const sp of latestReport.species) {
        const offshoreIds: string[] = OFFSHORE_SPECIES.map((s) => s.id);
        const isOffshore = offshoreIds.includes(sp.speciesId);
        const clustered = clusterReportSpots(sp.spots, latestReport.id, isOffshore);
        for (const spot of clustered) {
          spots.push({ ...spot, speciesName: sp.speciesName });
        }
      }
    }
    return spots;
  }, [latestReport]);

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

  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  const handleProLayerTap = useCallback((layerId: string) => {
    // Always toggle the layer — free users get a preview (dimmed + zoom-limited)
    if (layerId === 'ocean')      setBaseMap((prev) => prev === 'ocean' ? 'satellite' : 'ocean');
    if (layerId === 'depthchart') setShowDepthChart((prev) => !prev);
    if (layerId === 'nautical')   setShowNautical((prev) => !prev);
    if (layerId === 'seamarks')   setShowSeamarks((prev) => !prev);
    if (layerId === 'labels')     setShowLabels((prev) => !prev);

    // Show upgrade banner when non-Angler users tap a premium layer
    if (!isAnglerTier && layerId !== 'satellite') {
      setShowUpgradeBanner(true);
    }
  }, [isAnglerTier]);

  // ── Long-press to drop pin ────────────────
  const handleMapLongPress = useCallback((e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDroppedPin({ lat: latitude, lng: longitude });
    setScoutResults(null);
    setSelectedScout(null);
    setSelectedSpot(null);
  }, []);

  // ── Scout nearby structure from pinned location ──
  const handleScout = useCallback(async () => {
    if (!droppedPin) return;
    setScouting(true);
    try {
      const results = await scoutNearbyStructure(
        droppedPin.lat,
        droppedPin.lng,
        conditions?.tides?.currentTrend ?? 'rising',
        conditions?.weather?.windSpeed ?? 10,
        conditions?.weather?.windCardinal ?? 'SW',
      );
      setScoutResults(results);
    } catch (err) {
      Alert.alert('Scout Error', 'Could not analyze nearby structure. Try again.');
    } finally {
      setScouting(false);
    }
  }, [droppedPin, conditions]);

  // ── Clear pin ─────────────────────────────
  const clearPin = useCallback(() => {
    setDroppedPin(null);
    setScoutResults(null);
    setSelectedScout(null);
  }, []);

  // ── Cast Tracker controls ──────────────
  const handleCastDetected = useCallback((cast: CastEstimate) => {
    setActiveCast(cast);
    setCastHistory((prev) => [cast, ...prev].slice(0, 20)); // keep last 20
    // Animate map to show both angler and rig position
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: (cast.userLat + cast.estimatedLat) / 2,
        longitude: (cast.userLng + cast.estimatedLng) / 2,
        latitudeDelta: Math.max(0.005, Math.abs(cast.userLat - cast.estimatedLat) * 3),
        longitudeDelta: Math.max(0.005, Math.abs(cast.userLng - cast.estimatedLng) * 3),
      }, 400);
    }
  }, []);

  const toggleCastTracking = useCallback(async () => {
    if (castTracking) {
      stopCastTracking();
      setCastTracking(false);
    } else {
      const ok = await startCastTracking(handleCastDetected, selectedTackle);
      if (ok) {
        setCastTracking(true);
      } else {
        Alert.alert(
          'Sensors Unavailable',
          'Cast tracking requires accelerometer and gyroscope sensors. This feature is available on iOS and Android devices.',
        );
      }
    }
  }, [castTracking, handleCastDetected, selectedTackle]);

  const handleTackleChange = useCallback((tackleId: string) => {
    setSelectedTackle(tackleId);
    setTackleWeight(tackleId);
    setShowTackleSelect(false);
  }, []);

  const clearCastHistory = useCallback(() => {
    setActiveCast(null);
    setCastHistory([]);
  }, []);

  // Keep angler position updated for the cast tracker
  useEffect(() => {
    if (!castTracking) return;
    // Use conditions location as baseline, update from map if available
    const loc = conditions?.location;
    if (loc) {
      updateAnglerPosition(loc.lat, loc.lng);
    }
  }, [castTracking, conditions?.location]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCastTracking();
    };
  }, []);

  // ── Waypoint Navigation — update nav info when target or location changes ──
  const navTarget = navActive && allSpots.length > 0 ? allSpots[navTargetIdx % allSpots.length] : null;

  useEffect(() => {
    if (!navActive || !navTarget || !conditions?.location) {
      setNavInfo(null);
      return;
    }
    const userLat = conditions.location.lat;
    const userLng = conditions.location.lng;
    const info = getWaypointInfo(
      userLat, userLng,
      navTarget.coordinates.lat, navTarget.coordinates.lng,
      user?.boatSpeedMph ?? 25,
    );
    setNavInfo(info);
  }, [navActive, navTargetIdx, conditions?.location, navTarget, user?.boatSpeedMph]);

  const handleNavNext = useCallback(() => {
    if (allSpots.length === 0) return;
    const nextIdx = (navTargetIdx + 1) % allSpots.length;
    setNavTargetIdx(nextIdx);
    // Animate map to next spot
    const spot = allSpots[nextIdx];
    mapRef.current?.animateToRegion({
      latitude: spot.coordinates.lat,
      longitude: spot.coordinates.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  }, [navTargetIdx, allSpots]);

  const handleNavPrev = useCallback(() => {
    if (allSpots.length === 0) return;
    const prevIdx = (navTargetIdx - 1 + allSpots.length) % allSpots.length;
    setNavTargetIdx(prevIdx);
    const spot = allSpots[prevIdx];
    mapRef.current?.animateToRegion({
      latitude: spot.coordinates.lat,
      longitude: spot.coordinates.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  }, [navTargetIdx, allSpots]);

  const toggleNav = useCallback(() => {
    if (!navActive && allSpots.length > 0) {
      // Start navigation — sort spots by distance and start with nearest
      if (conditions?.location) {
        const sorted = sortSpotsByDistance(allSpots, conditions.location.lat, conditions.location.lng);
        const nearestIdx = allSpots.indexOf(sorted[0]);
        setNavTargetIdx(nearestIdx >= 0 ? nearestIdx : 0);
      }
      setNavActive(true);
    } else {
      setNavActive(false);
      setNavInfo(null);
    }
  }, [navActive, allSpots, conditions?.location]);

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
            <Text style={s.webProTitle}>PRO ANGLER MAP LAYERS</Text>
            <Text style={s.webProDesc}>
              Upgrade to Pro Angler to unlock ESRI Ocean Relief, NOAA Nautical Charts, and depth contours on mobile.
            </Text>
            {!isAnglerTier && (
              <TouchableOpacity
                style={s.webProBtn}
                onPress={() => startCheckout('angler_monthly', user?.email)}
                activeOpacity={0.85}
              >
                <Text style={s.webProBtnText}>PRO ANGLER — ${PRICING.ANGLER_MONTHLY}/MO</Text>
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
    if (id === 'satellite')  return baseMap === 'satellite';
    if (id === 'ocean')      return baseMap === 'ocean';
    if (id === 'depthchart') return showDepthChart;
    if (id === 'nautical')   return showNautical;
    if (id === 'seamarks')   return showSeamarks;
    if (id === 'labels')     return showLabels;
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
        onLongPress={handleMapLongPress}
      >
        {/* ESRI Ocean Relief basemap — full quality for Pro Angler, preview for others */}
        {baseMap === 'ocean' && UrlTile && (
          <UrlTile
            urlTemplate={ESRI_OCEAN_TILE_URL}
            maximumZ={isAnglerTier ? 16 : 10}
            tileSize={256}
            opacity={isAnglerTier ? 1 : 0.6}
            zIndex={1}
          />
        )}

        {/* NOAA ENC Depth Contours — depth soundings, contour lines, ledges */}
        {showDepthChart && UrlTile && (
          <UrlTile
            urlTemplate={NOAA_ENC_TILE_URL}
            maximumZ={isAnglerTier ? 17 : 10}
            tileSize={256}
            opacity={isAnglerTier ? 0.85 : 0.4}
            zIndex={2}
          />
        )}

        {/* NOAA Nautical Chart overlay — full quality for Pro Angler */}
        {showNautical && UrlTile && (
          <UrlTile
            urlTemplate={NOAA_CHART_TILE_URL}
            maximumZ={isAnglerTier ? 15 : 10}
            tileSize={256}
            opacity={isAnglerTier ? 0.75 : 0.4}
            zIndex={3}
          />
        )}

        {/* OpenSeaMap Seamarks — buoys, beacons, aids to navigation */}
        {showSeamarks && UrlTile && (
          <UrlTile
            urlTemplate={OPENSEAMAP_TILE_URL}
            maximumZ={isAnglerTier ? 17 : 10}
            tileSize={256}
            opacity={isAnglerTier ? 0.9 : 0.5}
            zIndex={4}
          />
        )}

        {/* ESRI Ocean Reference / Labels overlay */}
        {showLabels && UrlTile && (
          <UrlTile
            urlTemplate={ESRI_OCEAN_REF_URL}
            maximumZ={isAnglerTier ? 16 : 10}
            tileSize={256}
            opacity={isAnglerTier ? 0.9 : 0.5}
            zIndex={5}
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

        {/* Dropped pin marker */}
        {droppedPin && Marker && (
          <Marker
            coordinate={{ latitude: droppedPin.lat, longitude: droppedPin.lng }}
            title="Your Pin"
            description="Tap SCOUT to find nearby structure"
            pinColor={COLORS.warning}
          />
        )}

        {/* Scout result markers */}
        {scoutResults && scoutResults.map((sr, i) => Marker && (
          <Marker
            key={`scout-${i}`}
            coordinate={{ latitude: sr.lat, longitude: sr.lng }}
            title={`${sr.direction} — ${sr.name}`}
            description={`${sr.depthFt} · ${sr.structureType}`}
            pinColor={sr.confidence === 'high' ? COLORS.success : sr.confidence === 'medium' ? COLORS.warning : COLORS.textMuted}
            onPress={() => { setSelectedScout(sr); setSelectedSpot(null); }}
          />
        ))}

        {/* Cast tracker — active rig position marker */}
        {activeCast && Marker && (
          <Marker
            coordinate={{ latitude: activeCast.estimatedLat, longitude: activeCast.estimatedLng }}
            title={`RIG — ${activeCast.estimatedDistanceYds} yds ${bearingToCardinal(activeCast.estimatedBearing)}`}
            description={`±${activeCast.accuracyRadiusYds} yds accuracy`}
            pinColor="#FF6B35"
            onPress={() => setSelectedSpot(null)}
          />
        )}

        {/* Cast history markers (dimmed) */}
        {castHistory.slice(1).map((c) => Marker && (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.estimatedLat, longitude: c.estimatedLng }}
            title={`Previous — ${c.estimatedDistanceYds} yds`}
            pinColor="#FF6B3566"
            opacity={0.4}
          />
        ))}

        {/* Waypoint navigation route line */}
        {navActive && navTarget && conditions?.location && Polyline && (
          <Polyline
            coordinates={[
              { latitude: conditions.location.lat, longitude: conditions.location.lng },
              { latitude: navTarget.coordinates.lat, longitude: navTarget.coordinates.lng },
            ]}
            strokeColor={COLORS.seafoam}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
            zIndex={10}
          />
        )}
      </MapView>

      {/* ── Pro Angler Upgrade Banner (non-Angler users using premium layers) ── */}
      {showUpgradeBanner && !isAnglerTier && (
        <View style={s.upgradeBanner}>
          <View style={s.upgradeBannerContent}>
            <Text style={s.upgradeBannerText}>
              Preview mode — upgrade to Pro Angler for full zoom + HD tiles
            </Text>
            <View style={s.upgradeBannerBtns}>
              <TouchableOpacity
                style={s.upgradeBannerBtn}
                onPress={() => startCheckout('angler_monthly', user?.email)}
                activeOpacity={0.85}
              >
                <Text style={s.upgradeBannerBtnText}>PRO ANGLER ${PRICING.ANGLER_MONTHLY}/MO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowUpgradeBanner(false)}
                activeOpacity={0.8}
              >
                <Text style={s.upgradeBannerDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
            const isProLayer = layer.anglerOnly && !isAnglerTier;
            return (
              <TouchableOpacity
                key={layer.id}
                style={[s.layerRow, active && s.layerRowActive]}
                onPress={() => {
                  if (layer.id === 'satellite') {
                    setBaseMap('satellite');
                    setShowUpgradeBanner(false);
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
                    {isProLayer && (
                      <View style={s.proBadge}>
                        <Text style={s.proBadgeText}>{active ? 'PREVIEW' : 'PRO ANGLER'}</Text>
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

          {!isAnglerTier && (
            <TouchableOpacity
              style={s.layerUpgradeBtn}
              onPress={() => startCheckout('angler_monthly', user?.email)}
              activeOpacity={0.85}
            >
              <Text style={s.layerUpgradeText}>UNLOCK ALL LAYERS — PRO ANGLER ${PRICING.ANGLER_MONTHLY}/MO</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Waypoint Navigation Toggle Button ── */}
      {allSpots.length > 0 && (
        <TouchableOpacity
          style={[s.navToggleBtn, navActive && s.navToggleBtnActive]}
          onPress={toggleNav}
          activeOpacity={0.8}
        >
          <Text style={s.navToggleIcon}>🧭</Text>
          <Text style={[s.navToggleText, navActive && s.navToggleTextActive]}>
            {navActive ? 'NAV ON' : 'NAV'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Cast Tracker Toggle Button ─────── */}
      {castAvailable && (
        <TouchableOpacity
          style={[s.castToggleBtn, castTracking && s.castToggleBtnActive]}
          onPress={toggleCastTracking}
          activeOpacity={0.8}
        >
          <Text style={s.castToggleIcon}>🎯</Text>
          <Text style={[s.castToggleText, castTracking && s.castToggleTextActive]}>
            {castTracking ? 'TRACKING' : 'CAST PLOT'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Cast Tracker Tackle Weight Selector ── */}
      {castTracking && (
        <TouchableOpacity
          style={s.tackleBtn}
          onPress={() => setShowTackleSelect((p) => !p)}
          activeOpacity={0.8}
        >
          <Text style={s.tackleBtnText}>
            ⚖ {TACKLE_WEIGHTS.find((t) => t.id === selectedTackle)?.label ?? 'Medium'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tackle weight picker dropdown */}
      {showTackleSelect && (
        <View style={s.tacklePanel}>
          <Text style={s.tacklePanelTitle}>TACKLE WEIGHT</Text>
          <Text style={s.tacklePanelSub}>Affects distance estimation</Text>
          {TACKLE_WEIGHTS.map((tw) => (
            <TouchableOpacity
              key={tw.id}
              style={[s.tackleRow, tw.id === selectedTackle && s.tackleRowActive]}
              onPress={() => handleTackleChange(tw.id)}
              activeOpacity={0.75}
            >
              <View style={s.tackleRowInfo}>
                <Text style={[s.tackleRowLabel, tw.id === selectedTackle && s.tackleRowLabelActive]}>
                  {tw.label}
                </Text>
                <Text style={s.tackleRowDesc}>{tw.description}</Text>
              </View>
              {tw.id === selectedTackle && (
                <Text style={s.tackleCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Active Cast Info Card ────────────── */}
      {activeCast && !selectedSpot && !selectedScout && (
        <View style={s.castCard}>
          <View style={s.castCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.castCardTitle}>🎯 RIG POSITION (ESTIMATED)</Text>
              <Text style={s.castCardDisclaimer}>±{activeCast.accuracyRadiusYds} yds accuracy</Text>
            </View>
            <TouchableOpacity onPress={clearCastHistory}>
              <Text style={s.spotDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.castCardStats}>
            <View style={s.castStat}>
              <Text style={s.castStatValue}>{activeCast.estimatedDistanceYds}</Text>
              <Text style={s.castStatLabel}>YARDS</Text>
            </View>
            <View style={s.castStat}>
              <Text style={s.castStatValue}>{bearingToCardinal(activeCast.estimatedBearing)}</Text>
              <Text style={s.castStatLabel}>BEARING</Text>
            </View>
            <View style={s.castStat}>
              <Text style={s.castStatValue}>{activeCast.estimatedBearing}°</Text>
              <Text style={s.castStatLabel}>HEADING</Text>
            </View>
            <View style={s.castStat}>
              <Text style={s.castStatValue}>{Math.round(activeCast.peakAcceleration)}</Text>
              <Text style={s.castStatLabel}>FORCE</Text>
            </View>
          </View>

          <Text style={s.castCardCoords}>
            Est. position: {activeCast.estimatedLat.toFixed(5)}, {activeCast.estimatedLng.toFixed(5)}
          </Text>

          {castHistory.length > 1 && (
            <Text style={s.castHistoryCount}>
              {castHistory.length} casts tracked this session
            </Text>
          )}

          <TouchableOpacity
            style={s.castNavBtn}
            onPress={() => openNavigation(activeCast.estimatedLat, activeCast.estimatedLng, 'Rig Position')}
            activeOpacity={0.85}
          >
            <Text style={s.spotDetailNavText}>NAVIGATE TO RIG →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Waypoint Navigation Compass Card ── */}
      {navActive && navTarget && navInfo && (
        <View style={s.navCard}>
          <View style={s.navCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.navCardTitle}>NAVIGATING TO</Text>
              <Text style={s.navCardSpotName} numberOfLines={1}>
                {navTarget.name}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleNav}>
              <Text style={s.spotDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Compass bearing + stats row */}
          <View style={s.navCardStats}>
            <View style={s.navStat}>
              <Text style={s.navStatValue}>{navInfo.bearingDeg}°</Text>
              <Text style={s.navStatLabel}>BEARING</Text>
            </View>
            <View style={s.navStatDivider} />
            <View style={s.navStatCenter}>
              <Text style={s.navCompassValue}>{navInfo.bearingCardinal}</Text>
              <Text style={s.navStatLabel}>HEADING</Text>
            </View>
            <View style={s.navStatDivider} />
            <View style={s.navStat}>
              <Text style={s.navStatValue}>{navInfo.distanceLabel}</Text>
              <Text style={s.navStatLabel}>DISTANCE</Text>
            </View>
            <View style={s.navStatDivider} />
            <View style={s.navStat}>
              <Text style={s.navStatValue}>{navInfo.etaLabel}</Text>
              <Text style={s.navStatLabel}>ETA</Text>
            </View>
          </View>

          {/* Coordinates */}
          <Text style={s.navCardCoords}>
            {navTarget.coordinates.lat.toFixed(5)}, {navTarget.coordinates.lng.toFixed(5)}
          </Text>

          {/* Prev / Next controls */}
          <View style={s.navControls}>
            <TouchableOpacity style={s.navPrevBtn} onPress={handleNavPrev} activeOpacity={0.75}>
              <Text style={s.navControlText}>◀ PREV</Text>
            </TouchableOpacity>
            <Text style={s.navSpotCounter}>
              {(navTargetIdx % allSpots.length) + 1} / {allSpots.length}
            </Text>
            <TouchableOpacity style={s.navNextBtn} onPress={handleNavNext} activeOpacity={0.75}>
              <Text style={s.navControlText}>NEXT ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Navigate externally */}
          <TouchableOpacity
            style={s.navExternalBtn}
            onPress={() => openNavigation(navTarget.coordinates.lat, navTarget.coordinates.lng, navTarget.name)}
            activeOpacity={0.85}
          >
            <Text style={s.spotDetailNavText}>OPEN IN MAPS →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Dropped Pin Action Bar ─────────── */}
      {droppedPin && (
        <View style={s.pinBar}>
          <View style={s.pinBarInfo}>
            <Text style={s.pinBarLabel}>📍 PIN DROPPED</Text>
            <Text style={s.pinBarCoords}>
              {droppedPin.lat.toFixed(4)}, {droppedPin.lng.toFixed(4)}
            </Text>
          </View>
          <TouchableOpacity
            style={s.scoutBtn}
            onPress={handleScout}
            disabled={scouting}
            activeOpacity={0.85}
          >
            {scouting ? (
              <ActivityIndicator size="small" color="#060E1A" />
            ) : (
              <Text style={s.scoutBtnText}>SCOUT</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.pinClearBtn} onPress={clearPin} activeOpacity={0.75}>
            <Text style={s.pinClearText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Scout Results Card ─────────────── */}
      {scoutResults && scoutResults.length > 0 && !selectedScout && (
        <View style={s.scoutResultsPanel}>
          <Text style={s.scoutResultsTitle}>NEARBY STRUCTURE FOUND</Text>
          <Text style={s.scoutResultsSub}>Tap a result to see details and navigate</Text>
          {scoutResults.map((sr, i) => (
            <TouchableOpacity
              key={`sr-${i}`}
              style={s.scoutRow}
              onPress={() => {
                setSelectedScout(sr);
                mapRef.current?.animateToRegion({
                  latitude: sr.lat,
                  longitude: sr.lng,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }, 500);
              }}
              activeOpacity={0.75}
            >
              <View style={[s.scoutDirBadge, {
                backgroundColor: sr.confidence === 'high' ? COLORS.success :
                  sr.confidence === 'medium' ? COLORS.warning : COLORS.textMuted
              }]}>
                <Text style={s.scoutDirText}>{sr.direction}</Text>
              </View>
              <View style={s.scoutRowInfo}>
                <Text style={s.scoutRowName}>{sr.name}</Text>
                <Text style={s.scoutRowMeta}>
                  {sr.structureType} · {sr.depthFt} · {sr.distanceYds} yds {sr.direction}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Selected Scout Detail ──────────── */}
      {selectedScout && (
        <View style={s.spotDetail}>
          <View style={s.spotDetailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.spotDetailName}>{selectedScout.name}</Text>
              <Text style={s.spotDetailSpecies}>
                {selectedScout.direction} · {selectedScout.structureType}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedScout(null)}>
              <Text style={s.spotDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.spotDetailDepth}>
            Depth: {selectedScout.depthFt} · {selectedScout.distanceYds} yds from your pin
          </Text>
          <Text style={s.spotDetailNotes}>{selectedScout.why}</Text>
          {selectedScout.species && selectedScout.species.length > 0 && (
            <Text style={s.scoutSpeciesRow}>
              🎣 Best for: {selectedScout.species.join(', ')}
            </Text>
          )}
          {selectedScout.approach && (
            <Text style={s.scoutApproach}>
              📐 {selectedScout.approach}
            </Text>
          )}
          <TouchableOpacity
            style={s.spotDetailNav}
            onPress={() => openNavigation(selectedScout.lat, selectedScout.lng, selectedScout.name)}
            activeOpacity={0.85}
          >
            <Text style={s.spotDetailNavText}>NAVIGATE →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Spot count badge */}
      <View style={s.spotCountBadge}>
        <Text style={s.spotCountText}>
          {allSpots.length} SPOT{allSpots.length !== 1 ? 'S' : ''}
        </Text>
      </View>

      {/* Active layers indicator */}
      {isAnglerTier && (baseMap === 'ocean' || showDepthChart || showNautical || showSeamarks || showLabels) && (
        <View style={s.activeLayersBadge}>
          <Text style={s.activeLayersText}>
            {[
              baseMap === 'ocean' ? 'RELIEF' : null,
              showDepthChart ? 'DEPTH' : null,
              showNautical ? 'CHART' : null,
              showSeamarks ? 'MARKS' : null,
              showLabels ? 'LABELS' : null,
            ].filter(Boolean).join(' + ')}
          </Text>
        </View>
      )}

      {/* ── Depth Legend (Pro users, when depth or ocean layer active) ── */}
      {isAnglerTier && (showDepthChart || baseMap === 'ocean') && (
        <View style={s.depthLegend}>
          <Text style={s.depthLegendTitle}>DEPTH</Text>
          <View style={s.depthLegendRow}>
            <View style={[s.depthSwatch, { backgroundColor: '#ADE8F4' }]} />
            <Text style={s.depthLegendLabel}>0–6 ft</Text>
          </View>
          <View style={s.depthLegendRow}>
            <View style={[s.depthSwatch, { backgroundColor: '#48CAE4' }]} />
            <Text style={s.depthLegendLabel}>6–15 ft</Text>
          </View>
          <View style={s.depthLegendRow}>
            <View style={[s.depthSwatch, { backgroundColor: '#0096C7' }]} />
            <Text style={s.depthLegendLabel}>15–30 ft</Text>
          </View>
          <View style={s.depthLegendRow}>
            <View style={[s.depthSwatch, { backgroundColor: '#0077B6' }]} />
            <Text style={s.depthLegendLabel}>30–60 ft</Text>
          </View>
          <View style={s.depthLegendRow}>
            <View style={[s.depthSwatch, { backgroundColor: '#023E8A' }]} />
            <Text style={s.depthLegendLabel}>60–120 ft</Text>
          </View>
          <View style={s.depthLegendRow}>
            <View style={[s.depthSwatch, { backgroundColor: '#03045E' }]} />
            <Text style={s.depthLegendLabel}>120+ ft</Text>
          </View>
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

      {/* Empty state removed — map shows regardless, spots appear when reports are generated */}
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

  // ── Upgrade Banner ────────────────────
  upgradeBanner: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
  },
  upgradeBannerContent: {
    backgroundColor: 'rgba(6,14,26,0.92)',
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 14,
    alignItems: 'center',
  },
  upgradeBannerText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: MONO,
    textAlign: 'center',
    marginBottom: 10,
  },
  upgradeBannerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  upgradeBannerBtn: {
    backgroundColor: COLORS.seafoam,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  upgradeBannerBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  upgradeBannerDismiss: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: MONO,
  },

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

  // ── Waypoint Nav Toggle Button ───────
  navToggleBtn: {
    position: 'absolute',
    top: 60,
    right: 120,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: GRID_LINE,
    gap: 5,
  },
  navToggleBtnActive: {
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}15`,
  },
  navToggleIcon: {
    fontSize: 13,
  },
  navToggleText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  navToggleTextActive: {
    color: COLORS.seafoam,
  },

  // ── Waypoint Nav Compass Card ─────────
  navCard: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 14,
  },
  navCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  navCardTitle: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  navCardSpotName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
    marginTop: 2,
  },
  navCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  navStat: {
    alignItems: 'center',
    flex: 1,
  },
  navStatCenter: {
    alignItems: 'center',
    flex: 1.2,
  },
  navStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
  },
  navCompassValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  navStatLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  navStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: GRID_LINE,
  },
  navCardCoords: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    textAlign: 'center',
    marginBottom: 10,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navPrevBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: `${GRID_LINE}`,
    borderWidth: 1,
    borderColor: GRID_LINE,
  },
  navNextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: `${GRID_LINE}`,
    borderWidth: 1,
    borderColor: GRID_LINE,
  },
  navControlText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  navSpotCounter: {
    fontSize: 11,
    color: COLORS.seafoam,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1,
  },
  navExternalBtn: {
    backgroundColor: COLORS.seafoam,
    paddingVertical: 10,
    alignItems: 'center',
  },

  // ── Depth Legend ─────────────────────
  depthLegend: {
    position: 'absolute',
    bottom: 90,
    left: 12,
    backgroundColor: 'rgba(10,37,64,0.92)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.25)',
  },
  depthLegendTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  depthLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  depthSwatch: {
    width: 14,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
  },
  depthLegendLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontFamily: MONO,
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

  // ── Pin & Scout styles ────────────
  pinBar: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.warning,
    padding: 10,
  },
  pinBarInfo: { flex: 1 },
  pinBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.warning,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  pinBarCoords: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },
  scoutBtn: {
    backgroundColor: COLORS.seafoam,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginLeft: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  scoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 2,
  },
  pinClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 6,
  },
  pinClearText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },

  // ── Scout Results Panel ───────────
  scoutResultsPanel: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 12,
    maxHeight: 300,
  },
  scoutResultsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  scoutResultsSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  scoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: GRID_LINE,
  },
  scoutDirBadge: {
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scoutDirText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  scoutRowInfo: { flex: 1 },
  scoutRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  scoutRowMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },
  scoutSpeciesRow: {
    fontSize: 11,
    color: COLORS.seafoam,
    marginBottom: 6,
    lineHeight: 16,
  },
  scoutApproach: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // ── Cast Tracker styles ───────────
  castToggleBtn: {
    position: 'absolute',
    top: 100,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: GRID_LINE,
    gap: 5,
  },
  castToggleBtnActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B3518',
  },
  castToggleIcon: {
    fontSize: 12,
  },
  castToggleText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  castToggleTextActive: {
    color: '#FF6B35',
  },
  tackleBtn: {
    position: 'absolute',
    top: 135,
    left: 12,
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FF6B3544',
  },
  tackleBtnText: {
    fontSize: 9,
    color: '#FF6B35',
    fontFamily: MONO,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tacklePanel: {
    position: 'absolute',
    top: 160,
    left: 12,
    width: 220,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: '#FF6B3544',
    padding: 12,
  },
  tacklePanelTitle: {
    fontSize: 10,
    color: '#FF6B35',
    fontFamily: MONO,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 2,
  },
  tacklePanelSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  tackleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 3,
  },
  tackleRowActive: {
    borderColor: '#FF6B3544',
    backgroundColor: '#FF6B350A',
  },
  tackleRowInfo: { flex: 1 },
  tackleRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: MONO,
  },
  tackleRowLabelActive: {
    color: '#FF6B35',
  },
  tackleRowDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  tackleCheck: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B35',
    marginLeft: 8,
  },

  // ── Cast Info Card ────────────────
  castCard: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: '#FF6B35',
    padding: 14,
  },
  castCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  castCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  castCardDisclaimer: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },
  castCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: GRID_LINE,
  },
  castStat: {
    alignItems: 'center',
    flex: 1,
  },
  castStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
  },
  castStatLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  castCardCoords: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginBottom: 6,
  },
  castHistoryCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: MONO,
    marginBottom: 10,
  },
  castNavBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    alignItems: 'center',
  },
});
