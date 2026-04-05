import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert, Platform, Switch, Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, INSHORE_SPECIES, OFFSHORE_SPECIES, LIVE_BAIT, FROZEN_BAIT, ARTIFICIAL_BAIT } from '@constants/index';
import { useReportStore } from '@stores/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

// Conditional imports for native modules
let ImagePicker: any = null;
let Sharing: any = null;
if (Platform.OS !== 'web') {
  try { ImagePicker = require('expo-image-picker'); } catch {}
  try { Sharing = require('expo-sharing'); } catch {}
}

type Step = 'select-report' | 'location' | 'species' | 'bait' | 'results' | 'photos' | 'share' | 'done';

interface TripData {
  reportId: string | null;
  locationName: string;
  locationCoords: { lat: number; lng: number } | null;
  speciesCaught: string[];
  baitUsed: string[];
  rating: number;        // 1-5 how good was the trip
  notes: string;
  photos: { uri: string; caption: string }[];
  shareCoordinates: boolean;
  shareToSocial: boolean;
}

const INITIAL_TRIP: TripData = {
  reportId: null,
  locationName: '',
  locationCoords: null,
  speciesCaught: [],
  baitUsed: [],
  rating: 0,
  notes: '',
  photos: [],
  shareCoordinates: false,
  shareToSocial: false,
};

const RATINGS = [
  { value: 1, label: 'TOUGH',     emoji: '😤', color: COLORS.danger },
  { value: 2, label: 'SLOW',      emoji: '🤷', color: COLORS.warning },
  { value: 3, label: 'DECENT',    emoji: '👍', color: COLORS.info },
  { value: 4, label: 'GOOD',      emoji: '🔥', color: COLORS.seafoam },
  { value: 5, label: 'LIGHTS OUT', emoji: '🐟', color: COLORS.success },
];

export default function TripLogScreen() {
  const { reports } = useReportStore();
  const [step, setStep] = useState<Step>('select-report');
  const [trip, setTrip] = useState<TripData>(INITIAL_TRIP);
  const [photoLoading, setPhotoLoading] = useState(false);

  const update = (partial: Partial<TripData>) =>
    setTrip((prev) => ({ ...prev, ...partial }));

  const toggleItem = (field: 'speciesCaught' | 'baitUsed', id: string) => {
    setTrip((prev) => {
      const current = prev[field];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...prev, [field]: next };
    });
  };

  const allSpecies = [...INSHORE_SPECIES, ...OFFSHORE_SPECIES];
  const allBait = [...LIVE_BAIT, ...FROZEN_BAIT, ...ARTIFICIAL_BAIT];

  // Get spots from selected report for location buttons
  const selectedReport = reports.find((r) => r.id === trip.reportId);
  const reportSpots = selectedReport
    ? selectedReport.species.flatMap((sp) =>
        sp.spots.map((s) => ({ ...s, speciesName: sp.speciesName }))
      )
    : [];

  const pickPhoto = useCallback(async (source: 'camera' | 'gallery') => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Photo upload is available on iOS and Android.');
      return;
    }
    setPhotoLoading(true);
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
        });
      }

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((a: any) => ({
          uri: a.uri,
          caption: '',
        }));
        update({ photos: [...trip.photos, ...newPhotos] });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick photo.');
    } finally {
      setPhotoLoading(false);
    }
  }, [trip.photos]);

  const handleShare = async () => {
    const lines = [
      `🐟 Trip Report — ${trip.locationName}`,
      ``,
      `Species: ${trip.speciesCaught.map((id) => allSpecies.find((s) => s.id === id)?.name ?? id).join(', ')}`,
      `Bait: ${trip.baitUsed.map((id) => allBait.find((b) => b.id === id)?.name ?? id).join(', ')}`,
      `Rating: ${RATINGS.find((r) => r.value === trip.rating)?.label ?? '—'}`,
      trip.notes ? `\nNotes: ${trip.notes}` : '',
      trip.shareCoordinates && trip.locationCoords
        ? `\nSpot: ${trip.locationCoords.lat.toFixed(4)}, ${trip.locationCoords.lng.toFixed(4)}`
        : '',
      `\nPowered by NGN Fishing — No Guide Needed™`,
      `ngnfishing.com`,
    ].filter(Boolean).join('\n');

    if (Sharing && trip.photos.length > 0) {
      try {
        await Sharing.shareAsync(trip.photos[0].uri, {
          dialogTitle: lines,
          mimeType: 'image/jpeg',
        });
      } catch {}
    } else {
      Alert.alert('Share Trip', lines);
    }
    setStep('done');
  };

  const resetTrip = () => {
    setTrip(INITIAL_TRIP);
    setStep('select-report');
  };

  // ── RENDER STEPS ──

  // Step 0: Select which report this trip was for
  if (step === 'select-report') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.stepLabel}>TRIP LOG</Text>
          <Text style={s.title}>How was your trip?</Text>
          <Text style={s.subtitle}>
            Select the report you fished, or start a new trip log.
          </Text>

          {reports.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No reports yet. Generate a report first, go fishing, then come back and log your trip.</Text>
            </View>
          ) : (
            <>
              {reports.slice(0, 10).map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={s.reportCard}
                  onPress={() => {
                    update({ reportId: report.id });
                    setStep('location');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.reportDate}>
                    {report.input?.date ?? '—'} · {report.input?.timeWindow ?? '—'}
                  </Text>
                  <Text style={s.reportSpecies}>
                    {report.species.map((sp) => sp.speciesName).join(', ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity
            style={s.skipReportBtn}
            onPress={() => setStep('location')}
            activeOpacity={0.8}
          >
            <Text style={s.skipReportText}>Log a trip without a report →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 1: Where did you go?
  if (step === 'location') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.stepLabel}>STEP 1 OF 5</Text>
          <Text style={s.title}>Where did you go?</Text>

          {reportSpots.length > 0 && (
            <>
              <Text style={s.sectionLabel}>FROM YOUR REPORT</Text>
              <View style={s.chipGrid}>
                {reportSpots.map((spot, i) => (
                  <TouchableOpacity
                    key={`${spot.id}-${i}`}
                    style={[
                      s.chip,
                      trip.locationName === spot.name && s.chipSelected,
                    ]}
                    onPress={() =>
                      update({
                        locationName: spot.name,
                        locationCoords: spot.coordinates,
                      })
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipText, trip.locationName === spot.name && s.chipTextSelected]}>
                      {spot.name}
                    </Text>
                    <Text style={s.chipSub}>{spot.speciesName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={s.sectionLabel}>OR TYPE A LOCATION</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Stono Inlet, Breach Inlet, Folly Pier..."
            placeholderTextColor={COLORS.textMuted}
            value={trip.locationName}
            onChangeText={(t) => update({ locationName: t })}
          />

          <TouchableOpacity
            style={[s.nextBtn, !trip.locationName && s.nextBtnDisabled]}
            onPress={() => setStep('species')}
            disabled={!trip.locationName}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2: What species?
  if (step === 'species') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.stepLabel}>STEP 2 OF 5</Text>
          <Text style={s.title}>What did you catch?</Text>
          <Text style={s.subtitle}>Select all species you caught or targeted.</Text>

          <Text style={s.sectionLabel}>INSHORE</Text>
          <View style={s.chipGrid}>
            {INSHORE_SPECIES.map((sp) => (
              <TouchableOpacity
                key={sp.id}
                style={[s.chip, trip.speciesCaught.includes(sp.id) && s.chipSelected]}
                onPress={() => toggleItem('speciesCaught', sp.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, trip.speciesCaught.includes(sp.id) && s.chipTextSelected]}>
                  {sp.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>OFFSHORE</Text>
          <View style={s.chipGrid}>
            {OFFSHORE_SPECIES.map((sp) => (
              <TouchableOpacity
                key={sp.id}
                style={[s.chip, trip.speciesCaught.includes(sp.id) && s.chipSelected]}
                onPress={() => toggleItem('speciesCaught', sp.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, trip.speciesCaught.includes(sp.id) && s.chipTextSelected]}>
                  {sp.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.navRow}>
            <TouchableOpacity onPress={() => setStep('location')} style={s.backBtn}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, s.nextBtnFlex]}
              onPress={() => setStep('bait')}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3: What bait?
  if (step === 'bait') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.stepLabel}>STEP 3 OF 5</Text>
          <Text style={s.title}>What bait did you use?</Text>

          <Text style={s.sectionLabel}>LIVE BAIT</Text>
          <View style={s.chipGrid}>
            {LIVE_BAIT.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[s.chip, trip.baitUsed.includes(b.id) && s.chipSelected]}
                onPress={() => toggleItem('baitUsed', b.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, trip.baitUsed.includes(b.id) && s.chipTextSelected]}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>FROZEN BAIT</Text>
          <View style={s.chipGrid}>
            {FROZEN_BAIT.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[s.chip, trip.baitUsed.includes(b.id) && s.chipSelected]}
                onPress={() => toggleItem('baitUsed', b.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, trip.baitUsed.includes(b.id) && s.chipTextSelected]}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>ARTIFICIALS</Text>
          <View style={s.chipGrid}>
            {ARTIFICIAL_BAIT.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[s.chip, trip.baitUsed.includes(b.id) && s.chipSelected]}
                onPress={() => toggleItem('baitUsed', b.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, trip.baitUsed.includes(b.id) && s.chipTextSelected]}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.navRow}>
            <TouchableOpacity onPress={() => setStep('species')} style={s.backBtn}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, s.nextBtnFlex]}
              onPress={() => setStep('results')}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 4: How was it?
  if (step === 'results') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.stepLabel}>STEP 4 OF 5</Text>
          <Text style={s.title}>How was the trip?</Text>

          <View style={s.ratingRow}>
            {RATINGS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  s.ratingBtn,
                  trip.rating === r.value && { borderColor: r.color, backgroundColor: `${r.color}18` },
                ]}
                onPress={() => update({ rating: r.value })}
                activeOpacity={0.75}
              >
                <Text style={s.ratingEmoji}>{r.emoji}</Text>
                <Text style={[s.ratingLabel, trip.rating === r.value && { color: r.color }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={[s.input, s.inputMulti]}
            placeholder="Water was clear, caught 3 reds on the incoming tide near the oyster beds..."
            placeholderTextColor={COLORS.textMuted}
            value={trip.notes}
            onChangeText={(t) => update({ notes: t })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={s.navRow}>
            <TouchableOpacity onPress={() => setStep('bait')} style={s.backBtn}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, s.nextBtnFlex, !trip.rating && s.nextBtnDisabled]}
              onPress={() => setStep('photos')}
              disabled={!trip.rating}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 5: Photos + sharing
  if (step === 'photos' || step === 'share') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.stepLabel}>STEP 5 OF 5</Text>
          <Text style={s.title}>Add photos and share</Text>

          {/* Photo upload */}
          <View style={s.photoActions}>
            <TouchableOpacity
              style={s.photoBtn}
              onPress={() => pickPhoto('camera')}
              activeOpacity={0.8}
            >
              <Text style={s.photoBtnIcon}>📷</Text>
              <Text style={s.photoBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.photoBtn}
              onPress={() => pickPhoto('gallery')}
              activeOpacity={0.8}
            >
              <Text style={s.photoBtnIcon}>🖼</Text>
              <Text style={s.photoBtnText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          {photoLoading && <ActivityIndicator color={COLORS.seafoam} style={{ marginTop: 12 }} />}

          {trip.photos.length > 0 && (
            <View style={s.photoGrid}>
              {trip.photos.map((photo, i) => (
                <View key={i} style={s.photoThumb}>
                  <Image source={{ uri: photo.uri }} style={s.photoImg} />
                  <TouchableOpacity
                    style={s.photoRemove}
                    onPress={() =>
                      update({ photos: trip.photos.filter((_, idx) => idx !== i) })
                    }
                  >
                    <Text style={s.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Sharing options */}
          <View style={s.shareSection}>
            <Text style={s.sectionLabel}>SHARING OPTIONS</Text>

            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Share coordinates</Text>
                <Text style={s.toggleHint}>
                  Let other NGN users see where you fished
                </Text>
              </View>
              <Switch
                value={trip.shareCoordinates}
                onValueChange={(v) => update({ shareCoordinates: v })}
                trackColor={{ false: '#0D2B4A', true: COLORS.seafoam }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Share to social media</Text>
                <Text style={s.toggleHint}>
                  Post your trip with NGN Fishing branding
                </Text>
              </View>
              <Switch
                value={trip.shareToSocial}
                onValueChange={(v) => update({ shareToSocial: v })}
                trackColor={{ false: '#0D2B4A', true: COLORS.seafoam }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          <View style={s.navRow}>
            <TouchableOpacity onPress={() => setStep('results')} style={s.backBtn}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, s.nextBtnFlex, s.submitBtn]}
              onPress={trip.shareToSocial ? handleShare : () => setStep('done')}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>
                {trip.shareToSocial ? 'Share & Save Trip' : 'Save Trip'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Done!
  if (step === 'done') {
    const ratingInfo = RATINGS.find((r) => r.value === trip.rating);
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.doneCard}>
            <Text style={s.doneEmoji}>{ratingInfo?.emoji ?? '🎣'}</Text>
            <Text style={s.doneTitle}>Trip Logged!</Text>
            <Text style={s.doneLocation}>{trip.locationName}</Text>
            <Text style={s.doneSummary}>
              {trip.speciesCaught.length} species · {trip.baitUsed.length} baits · {trip.photos.length} photos
            </Text>
            {ratingInfo && (
              <Text style={[s.doneRating, { color: ratingInfo.color }]}>
                {ratingInfo.label}
              </Text>
            )}
            <Text style={s.doneHint}>
              Your trip data helps NGN learn what's working and improves future reports.
            </Text>
          </View>

          <TouchableOpacity style={s.newTripBtn} onPress={resetTrip} activeOpacity={0.85}>
            <Text style={s.newTripText}>Log Another Trip</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ──
const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#060E1A' },
  content: { padding: 20, paddingBottom: 48 },

  stepLabel: {
    fontSize: 10, color: COLORS.textMuted, letterSpacing: 2,
    fontFamily: MONO, marginBottom: 4,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: COLORS.white,
    fontFamily: MONO, marginBottom: 6,
  },
  subtitle: {
    fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10, color: COLORS.textMuted, letterSpacing: 2,
    fontFamily: MONO, marginBottom: 8, marginTop: 20,
  },

  // Report selection
  reportCard: {
    backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE,
    padding: 14, marginBottom: 8,
  },
  reportDate: {
    fontSize: 13, fontWeight: '700', color: COLORS.white, fontFamily: MONO,
  },
  reportSpecies: {
    fontSize: 11, color: COLORS.seafoam, fontFamily: MONO, marginTop: 4,
  },
  skipReportBtn: { marginTop: 16, alignItems: 'center', padding: 12 },
  skipReportText: { fontSize: 13, color: COLORS.textMuted },
  emptyCard: {
    backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE,
    padding: 24, alignItems: 'center',
  },
  emptyText: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20,
  },

  // Chip grid
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE,
    paddingHorizontal: 14, paddingVertical: 10, minWidth: '45%', flex: 1,
  },
  chipSelected: { borderColor: COLORS.seafoam, backgroundColor: `${COLORS.seafoam}18` },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.seafoam },
  chipSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Input
  input: {
    backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE,
    padding: 14, color: COLORS.white, fontSize: 14,
  },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },

  // Rating
  ratingRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  ratingBtn: {
    flex: 1, alignItems: 'center', backgroundColor: PANEL_BG,
    borderWidth: 1, borderColor: GRID_LINE, paddingVertical: 14,
  },
  ratingEmoji: { fontSize: 24, marginBottom: 4 },
  ratingLabel: {
    fontSize: 8, color: COLORS.textMuted, fontFamily: MONO,
    letterSpacing: 1, fontWeight: '700',
  },

  // Photos
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  photoBtn: {
    flex: 1, backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE,
    paddingVertical: 20, alignItems: 'center',
  },
  photoBtnIcon: { fontSize: 28, marginBottom: 6 },
  photoBtnText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: MONO },
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
  },
  photoThumb: { width: '48%', aspectRatio: 1, position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: COLORS.white, fontSize: 14 },

  // Sharing
  shareSection: { marginTop: 8 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE,
    padding: 14, marginBottom: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  toggleHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Navigation
  navRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  nextBtn: {
    backgroundColor: COLORS.seafoam, paddingVertical: 16, alignItems: 'center',
    marginTop: 24,
  },
  nextBtnFlex: { flex: 1, marginTop: 0 },
  nextBtnDisabled: { opacity: 0.3 },
  nextBtnText: {
    fontSize: 14, fontWeight: '700', color: '#060E1A', fontFamily: MONO, letterSpacing: 1,
  },
  submitBtn: { backgroundColor: COLORS.success },
  backBtn: { paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'center' },
  backBtnText: { fontSize: 13, color: COLORS.textMuted, fontFamily: MONO },

  // Done
  doneCard: {
    backgroundColor: PANEL_BG, borderWidth: 1, borderColor: COLORS.seafoam,
    padding: 32, alignItems: 'center', marginTop: 20,
  },
  doneEmoji: { fontSize: 48, marginBottom: 12 },
  doneTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.seafoam, fontFamily: MONO, letterSpacing: 3,
  },
  doneLocation: {
    fontSize: 14, color: COLORS.white, fontFamily: MONO, marginTop: 8,
  },
  doneSummary: {
    fontSize: 12, color: COLORS.textSecondary, fontFamily: MONO, marginTop: 6,
  },
  doneRating: {
    fontSize: 14, fontWeight: '800', fontFamily: MONO, letterSpacing: 2, marginTop: 12,
  },
  doneHint: {
    fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18,
  },
  newTripBtn: {
    borderWidth: 1, borderColor: COLORS.seafoam, paddingVertical: 16,
    alignItems: 'center', marginTop: 20,
  },
  newTripText: {
    fontSize: 13, fontWeight: '700', color: COLORS.seafoam, fontFamily: MONO, letterSpacing: 2,
  },
});
