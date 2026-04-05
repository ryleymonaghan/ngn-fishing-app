import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS, TIME_WINDOWS, ACCESS_TYPES, BAIT_DELIVERY_METHODS,
  DELIVERY_ELIGIBLE_ACCESS, ROUTES, FISHING_LOCATIONS, LOCATION_REGIONS, DEFAULT_LOCATION,
} from '@constants/index';
import { useWizardStore, useConditionsStore } from '@stores/index';
import type { TimeWindowId, AccessTypeId, BaitDeliveryId } from '@constants/index';

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

export default function WizardStep1() {
  const router = useRouter();
  const { draft, updateDraft, setStep } = useWizardStore();
  const { conditions } = useConditionsStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Auto-detect closest preset to phone GPS on mount
  useEffect(() => {
    if (draft.fishingLocation) return; // already set
    const loc = conditions?.location;
    if (!loc) return;
    // Find closest preset
    let closest = FISHING_LOCATIONS[0];
    let minDist = Infinity;
    for (const fl of FISHING_LOCATIONS) {
      const d = Math.sqrt((fl.lat - loc.lat) ** 2 + (fl.lng - loc.lng) ** 2);
      if (d < minDist) { minDist = d; closest = fl; }
    }
    updateDraft({
      fishingLocation: { lat: closest.lat, lng: closest.lng, label: `${closest.label}, ${closest.region}` },
    });
  }, [conditions?.location]);

  const handleNext = () => {
    setStep(2);
    router.push(ROUTES.WIZARD.STEP_2 as any);
  };

  // Filter locations by search term + region
  const filteredLocations = FISHING_LOCATIONS.filter((fl) => {
    const matchSearch = !locationSearch || fl.label.toLowerCase().includes(locationSearch.toLowerCase());
    const matchRegion = !selectedRegion || fl.region === selectedRegion;
    return matchSearch && matchRegion;
  });

  const canProceed = draft.timeWindow && draft.accessType && draft.fishingLocation;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.stepLabel}>STEP 1 OF 2</Text>
        <Text style={s.title}>Where & when are you fishing?</Text>

        {/* Location */}
        <Text style={s.sectionLabel}>FISHING LOCATION</Text>
        <TouchableOpacity
          style={[s.dateRow, !draft.fishingLocation && s.locationEmpty]}
          onPress={() => setShowLocationPicker(!showLocationPicker)}
          activeOpacity={0.75}
        >
          <Text style={[s.dateText, !draft.fishingLocation && { color: COLORS.textMuted }]}>
            {draft.fishingLocation?.label ?? 'Tap to select where you\'re fishing'}
          </Text>
          <Text style={s.dateToggle}>{showLocationPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showLocationPicker && (
          <View style={s.locationPicker}>
            {/* Search */}
            <TextInput
              style={s.locationSearch}
              placeholder="Search locations..."
              placeholderTextColor={COLORS.textMuted}
              value={locationSearch}
              onChangeText={setLocationSearch}
              autoCapitalize="none"
            />

            {/* Region filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.regionScroll}>
              <TouchableOpacity
                style={[s.regionPill, !selectedRegion && s.regionPillActive]}
                onPress={() => setSelectedRegion(null)}
              >
                <Text style={[s.regionPillText, !selectedRegion && s.regionPillTextActive]}>ALL</Text>
              </TouchableOpacity>
              {LOCATION_REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.regionPill, selectedRegion === r && s.regionPillActive]}
                  onPress={() => setSelectedRegion(selectedRegion === r ? null : r)}
                >
                  <Text style={[s.regionPillText, selectedRegion === r && s.regionPillTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Location list */}
            <View style={s.locationList}>
              {filteredLocations.map((fl) => {
                const isSelected = draft.fishingLocation?.lat === fl.lat && draft.fishingLocation?.lng === fl.lng;
                return (
                  <TouchableOpacity
                    key={fl.id}
                    style={[s.locationItem, isSelected && s.locationItemSelected]}
                    onPress={() => {
                      updateDraft({
                        fishingLocation: { lat: fl.lat, lng: fl.lng, label: `${fl.label}, ${fl.region}` },
                      });
                      setShowLocationPicker(false);
                      setLocationSearch('');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.locationItemLabel, isSelected && s.locationItemLabelSelected]}>
                      {fl.label}
                    </Text>
                    <Text style={[s.locationItemRegion, isSelected && s.locationItemRegionSelected]}>
                      {fl.region}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Date */}
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

        {/* Time Window */}
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

        {/* Access Type */}
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
                  // Clear bait delivery if switching away from shore/surf
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

        {/* Bait Delivery — only for shore/surf */}
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

        {/* Next */}
        <TouchableOpacity
          style={[s.next, !canProceed && s.nextDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={s.nextText}>Next: Choose Species →</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.navy },
  content:       { padding: 24, paddingBottom: 48 },
  stepLabel:     { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
  title:         { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 28 },
  sectionLabel:  { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },
  dateRow:       { backgroundColor: COLORS.navyLight, borderRadius: 10, padding: 14, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText:      { color: COLORS.white, fontSize: 16 },
  dateToggle:    { color: COLORS.textMuted, fontSize: 12 },
  dateOptions:   { marginBottom: 8 },
  dateOption:    { backgroundColor: COLORS.navyLight, borderRadius: 8, padding: 12, marginTop: 4, borderWidth: 1.5, borderColor: 'transparent' },
  dateOptionSelected:     { borderColor: COLORS.seafoam },
  dateOptionText:         { color: COLORS.textSecondary, fontSize: 14 },
  dateOptionTextSelected: { color: COLORS.seafoam, fontWeight: '600' },
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
  locationEmpty:      { borderWidth: 1.5, borderColor: `${COLORS.warning}66` },
  locationPicker:     { backgroundColor: COLORS.navyLight, borderRadius: 10, padding: 12, marginBottom: 8, maxHeight: 360 },
  locationSearch: {
    backgroundColor: '#0A2540',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A3A5C',
  },
  regionScroll:       { marginBottom: 10 },
  regionPill: {
    backgroundColor: '#0A2540',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1A3A5C',
  },
  regionPillActive:   { borderColor: COLORS.seafoam, backgroundColor: `${COLORS.seafoam}15` },
  regionPillText:     { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  regionPillTextActive: { color: COLORS.seafoam },
  locationList:       { maxHeight: 220 },
  locationItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A3A5C',
  },
  locationItemSelected:       { backgroundColor: `${COLORS.seafoam}12` },
  locationItemLabel:          { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  locationItemLabelSelected:  { color: COLORS.seafoam, fontWeight: '600' as const },
  locationItemRegion:         { fontSize: 11, color: COLORS.textMuted, marginLeft: 8, fontWeight: '600' as const },
  locationItemRegionSelected: { color: COLORS.seafoam },
  next: {
    backgroundColor: COLORS.seafoam,
    borderRadius:    14,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       32,
  },
  nextDisabled: { opacity: 0.4 },
  nextText:     { fontSize: 16, fontWeight: '700', color: COLORS.navy },
});
