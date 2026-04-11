import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
  TextInput, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  COLORS, TIME_WINDOWS, ACCESS_TYPES, BAIT_DELIVERY_METHODS,
  DELIVERY_ELIGIBLE_ACCESS, ROUTES, DEFAULT_LOCATION,
} from '@constants/index';
import { useWizardStore, useConditionsStore } from '@stores/index';
import type { TimeWindowId, AccessTypeId, BaitDeliveryId } from '@constants/index';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? 'https://ngn-fishing-backend-production.up.railway.app';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Date helper ──────────────────────────────────
function getNextDays(count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const DATE_OPTIONS = getNextDays(7);

// ── Google Places Autocomplete prediction ────────
interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// ── Location methods ─────────────────────────────
async function searchPlaces(input: string, lat?: number, lng?: number): Promise<PlacePrediction[]> {
  if (!input || input.length < 2) return [];
  try {
    const locParam = lat && lng ? `&lat=${lat}&lng=${lng}` : '';
    const res = await fetch(`${BACKEND_URL}/api/places/autocomplete?input=${encodeURIComponent(input)}${locParam}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.predictions ?? [];
  } catch {
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/places/details?place_id=${encodeURIComponent(placeId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    return data.label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

async function getUserGPS(): Promise<{ lat: number; lng: number } | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000 },
      );
    });
  }
  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

// ── MapView for "Drop a Pin" (native only) ───────
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch {
    // react-native-maps not available
  }
}

export default function WizardStep1() {
  const router = useRouter();
  const { draft, updateDraft, setStep } = useWizardStore();
  const { conditions } = useConditionsStore();

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Location state
  const [locationSearch, setLocationSearch] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-detect GPS on mount if no location set
  useEffect(() => {
    if (draft.fishingLocation) return;
    handleUseMyLocation();
  }, []);

  // Debounced Google Places search
  const handleSearchChange = useCallback((text: string) => {
    setLocationSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setPredictions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const loc = conditions?.location;
      const results = await searchPlaces(text, loc?.lat, loc?.lng);
      setPredictions(results);
      setSearchLoading(false);
    }, 350);
  }, [conditions?.location]);

  // Use my location (GPS + reverse geocode)
  const handleUseMyLocation = async () => {
    setGpsLoading(true);
    try {
      const gps = await getUserGPS();
      if (!gps) {
        // Fallback to default
        updateDraft({
          fishingLocation: { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng, label: DEFAULT_LOCATION.label },
        });
        return;
      }
      const label = await reverseGeocode(gps.lat, gps.lng);
      updateDraft({ fishingLocation: { lat: gps.lat, lng: gps.lng, label } });
      setLocationSearch('');
      setPredictions([]);
    } catch {
      updateDraft({
        fishingLocation: { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng, label: DEFAULT_LOCATION.label },
      });
    } finally {
      setGpsLoading(false);
    }
  };

  // Select a prediction from autocomplete
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setSearchLoading(true);
    const details = await getPlaceDetails(prediction.placeId);
    if (details) {
      updateDraft({ fishingLocation: { lat: details.lat, lng: details.lng, label: details.label } });
    }
    setLocationSearch('');
    setPredictions([]);
    setSearchLoading(false);
  };

  // Drop a pin on map
  const handleMapPress = (e: any) => {
    const coord = e.nativeEvent?.coordinate;
    if (coord) {
      setPinLocation({ lat: coord.latitude, lng: coord.longitude });
    }
  };

  const handleConfirmPin = async () => {
    if (!pinLocation) return;
    setPinLoading(true);
    const label = await reverseGeocode(pinLocation.lat, pinLocation.lng);
    updateDraft({ fishingLocation: { lat: pinLocation.lat, lng: pinLocation.lng, label } });
    setPinLoading(false);
    setShowMap(false);
    setPinLocation(null);
  };

  const handleNext = () => {
    setStep(2);
    router.push(ROUTES.WIZARD.STEP_2 as any);
  };

  const canProceed = draft.timeWindow && draft.accessType && draft.fishingLocation;

  // Map initial region: use current location or default
  const mapInitial = {
    latitude: draft.fishingLocation?.lat ?? DEFAULT_LOCATION.lat,
    longitude: draft.fishingLocation?.lng ?? DEFAULT_LOCATION.lng,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <Text style={s.stepLabel}>STEP 1 OF 2</Text>
        <Text style={s.title}>Where & when are you fishing?</Text>

        {/* ── FISHING LOCATION ──────────────────── */}
        <Text style={s.sectionLabel}>FISHING LOCATION</Text>

        {/* Current selection display */}
        {draft.fishingLocation && (
          <View style={s.locationDisplay}>
            <View style={s.locationDot} />
            <Text style={s.locationText} numberOfLines={2}>
              {draft.fishingLocation.label}
            </Text>
          </View>
        )}

        {/* Use My Location button */}
        <TouchableOpacity
          style={s.gpsBtn}
          onPress={handleUseMyLocation}
          activeOpacity={0.75}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={COLORS.seafoam} />
          ) : (
            <Text style={s.gpsBtnIcon}>📍</Text>
          )}
          <Text style={s.gpsBtnText}>Use My Current Location</Text>
        </TouchableOpacity>

        {/* Search input */}
        <View style={s.searchWrap}>
          <TextInput
            style={s.searchInput}
            placeholder="Search a location..."
            placeholderTextColor={COLORS.textMuted}
            value={locationSearch}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchLoading && (
            <ActivityIndicator size="small" color={COLORS.seafoam} style={s.searchSpinner} />
          )}
        </View>

        {/* Autocomplete predictions */}
        {predictions.length > 0 && (
          <View style={s.predictionsList}>
            {predictions.map((p) => (
              <TouchableOpacity
                key={p.placeId}
                style={s.predictionItem}
                onPress={() => handleSelectPrediction(p)}
                activeOpacity={0.7}
              >
                <Text style={s.predictionMain} numberOfLines={1}>{p.mainText}</Text>
                <Text style={s.predictionSub} numberOfLines={1}>{p.secondaryText}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Drop a Pin button (native only — maps don't work on web) */}
        {MapView && (
          <TouchableOpacity
            style={s.pinBtn}
            onPress={() => {
              setPinLocation(null);
              setShowMap(true);
            }}
            activeOpacity={0.75}
          >
            <Text style={s.pinBtnIcon}>🗺️</Text>
            <Text style={s.pinBtnText}>Drop a Pin on Map</Text>
          </TouchableOpacity>
        )}

        {/* ── DATE ──────────────────────────────── */}
        <Text style={s.sectionLabel}>DATE</Text>
        <TouchableOpacity
          style={s.dateRow}
          onPress={() => setShowDatePicker(!showDatePicker)}
          activeOpacity={0.75}
        >
          <Text style={s.dateText}>
            {new Date(draft.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>
          <Text style={s.dateToggle}>{showDatePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <View style={s.dateOptions}>
            {DATE_OPTIONS.map((dateStr) => {
              const isSelected = draft.date === dateStr;
              const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              });
              const isToday = dateStr === DATE_OPTIONS[0];
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[s.dateOption, isSelected && s.dateOptionSelected]}
                  onPress={() => { updateDraft({ date: dateStr }); setShowDatePicker(false); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.dateOptionText, isSelected && s.dateOptionTextSelected]}>
                    {isToday ? `Today — ${label}` : label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── TIME WINDOW ──────────────────────── */}
        <Text style={s.sectionLabel}>TIME WINDOW</Text>
        {TIME_WINDOWS.map((w) => (
          <TouchableOpacity
            key={w.id}
            style={[s.option, draft.timeWindow === w.id && s.optionSelected]}
            onPress={() => updateDraft({ timeWindow: w.id as TimeWindowId })}
            activeOpacity={0.75}
          >
            <Text style={[s.optionLabel, draft.timeWindow === w.id && s.optionLabelSelected]}>
              {w.label}
            </Text>
            <Text style={[s.optionSub, draft.timeWindow === w.id && s.optionSubSelected]}>
              {w.hours}
            </Text>
          </TouchableOpacity>
        ))}

        {/* ── ACCESS TYPE ──────────────────────── */}
        <Text style={s.sectionLabel}>FISHING FROM</Text>
        <View style={s.rowGroup}>
          {ACCESS_TYPES.map((a) => {
            const selected = draft.accessType === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[s.accessCard, selected && s.accessCardSelected]}
                onPress={() => {
                  const update: any = { accessType: a.id as AccessTypeId };
                  if (!(DELIVERY_ELIGIBLE_ACCESS as readonly string[]).includes(a.id)) {
                    update.baitDeliveryMethod = undefined;
                  }
                  updateDraft(update);
                }}
                activeOpacity={0.75}
              >
                <Text style={[s.accessLabel, selected && s.accessLabelSelected]}>
                  {a.label}
                </Text>
                <Text style={[s.accessSub, selected && s.accessSubSelected]}>
                  {a.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── BAIT DELIVERY (shore/surf only) ──── */}
        {(DELIVERY_ELIGIBLE_ACCESS as readonly string[]).includes(draft.accessType) && (
          <>
            <Text style={s.sectionLabel}>BAIT DELIVERY METHOD</Text>
            <Text style={s.deliveryHint}>
              How are you getting bait to deeper water?
            </Text>
            <View style={s.rowGroup}>
              {BAIT_DELIVERY_METHODS.map((d) => {
                const selected = draft.baitDeliveryMethod === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[s.accessCard, selected && s.accessCardSelected]}
                    onPress={() => updateDraft({ baitDeliveryMethod: d.id as BaitDeliveryId })}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.accessLabel, selected && s.accessLabelSelected]}>
                      {d.label}
                    </Text>
                    <Text style={[s.accessSub, selected && s.accessSubSelected]}>
                      {d.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── NEXT BUTTON ──────────────────────── */}
        <TouchableOpacity
          style={[s.next, !canProceed && s.nextDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={s.nextText}>Next: Choose Species →</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── MAP MODAL (Drop a Pin) ─────────────── */}
      {MapView && (
        <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
          <View style={s.mapContainer}>
            <MapView
              style={s.map}
              initialRegion={mapInitial}
              onPress={handleMapPress}
              mapType="hybrid"
            >
              {pinLocation && Marker && (
                <Marker
                  coordinate={{ latitude: pinLocation.lat, longitude: pinLocation.lng }}
                  pinColor={COLORS.seafoam}
                />
              )}
            </MapView>

            {/* Map overlay controls */}
            <SafeAreaView style={s.mapOverlay} edges={['top']}>
              <View style={s.mapTopBar}>
                <TouchableOpacity onPress={() => setShowMap(false)} style={s.mapCloseBtn}>
                  <Text style={s.mapCloseBtnText}>✕ Cancel</Text>
                </TouchableOpacity>
                <Text style={s.mapTitle}>Tap to drop a pin</Text>
              </View>
            </SafeAreaView>

            {/* Pin confirmation bar */}
            {pinLocation && (
              <View style={s.mapBottomBar}>
                <Text style={s.mapPinLabel}>
                  {pinLocation.lat.toFixed(4)}, {pinLocation.lng.toFixed(4)}
                </Text>
                <TouchableOpacity
                  style={s.mapConfirmBtn}
                  onPress={handleConfirmPin}
                  disabled={pinLoading}
                  activeOpacity={0.85}
                >
                  {pinLoading ? (
                    <ActivityIndicator size="small" color={COLORS.navy} />
                  ) : (
                    <Text style={s.mapConfirmText}>Use This Location</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.navy },
  content:       { padding: 24, paddingBottom: 48 },
  stepLabel:     { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
  title:         { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 28 },
  sectionLabel:  { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },

  // Location display
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.seafoam,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.seafoam,
    marginRight: 10,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.seafoam,
    flex: 1,
  },

  // GPS button
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  gpsBtnIcon: { fontSize: 18 },
  gpsBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#1A3A5C',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  searchSpinner: { marginRight: 12 },

  // Predictions dropdown
  predictionsList: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A3A5C',
  },
  predictionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  predictionMain: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  predictionSub:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // Pin drop button
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
    gap: 10,
  },
  pinBtnIcon: { fontSize: 18 },
  pinBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Date
  dateRow:       { backgroundColor: COLORS.navyLight, borderRadius: 10, padding: 14, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText:      { color: COLORS.white, fontSize: 16 },
  dateToggle:    { color: COLORS.textMuted, fontSize: 12 },
  dateOptions:   { marginBottom: 8 },
  dateOption:    { backgroundColor: COLORS.navyLight, borderRadius: 8, padding: 12, marginTop: 4, borderWidth: 1.5, borderColor: 'transparent' },
  dateOptionSelected:     { borderColor: COLORS.seafoam },
  dateOptionText:         { color: COLORS.textSecondary, fontSize: 14 },
  dateOptionTextSelected: { color: COLORS.seafoam, fontWeight: '600' },

  // Options
  option: {
    backgroundColor: COLORS.navyLight,
    borderRadius:    10,
    padding:         14,
    marginBottom:    8,
    borderWidth:     1.5,
    borderColor:     'transparent',
  },
  optionSelected:      { borderColor: COLORS.seafoam },
  optionLabel:         { fontSize: 15, fontWeight: '600', color: COLORS.white },
  optionLabelSelected: { color: COLORS.seafoam },
  optionSub:           { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  optionSubSelected:   { color: COLORS.textSecondary },

  // Access cards
  rowGroup:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  accessCard: {
    width: '47%' as any,
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  accessCardSelected: { borderColor: COLORS.seafoam },
  accessLabel:        { fontSize: 15, fontWeight: '600', color: COLORS.white },
  accessLabelSelected:{ color: COLORS.seafoam },
  accessSub:          { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  accessSubSelected:  { color: COLORS.textSecondary },
  deliveryHint:       { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10, fontStyle: 'italic' },

  // Next button
  next: {
    backgroundColor: COLORS.seafoam,
    borderRadius:    14,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       32,
  },
  nextDisabled: { opacity: 0.4 },
  nextText:     { fontSize: 16, fontWeight: '700', color: COLORS.navy },

  // Map modal
  mapContainer: { flex: 1, backgroundColor: COLORS.navy },
  map:          { flex: 1 },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  mapTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.navy}DD`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  mapCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: `${COLORS.white}15`,
  },
  mapCloseBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  mapTitle:        { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  mapBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: `${COLORS.navy}EE`,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mapPinLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  mapConfirmBtn: {
    backgroundColor: COLORS.seafoam,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: 200,
  },
  mapConfirmText: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
});
