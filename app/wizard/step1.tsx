import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TIME_WINDOWS, ACCESS_TYPES, ROUTES } from '@constants/index';
import { useWizardStore } from '@stores/index';
import type { TimeWindowId, AccessTypeId } from '@constants/index';

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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleNext = () => {
    setStep(2);
    router.push(ROUTES.WIZARD.STEP_2 as any);
  };

  const canProceed = draft.timeWindow && draft.accessType;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.stepLabel}>STEP 1 OF 3</Text>
        <Text style={s.title}>When are you fishing?</Text>

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
          {ACCESS_TYPES.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[s.pill, draft.accessType === a.id && s.pillSelected]}
              onPress={() => updateDraft({ accessType: a.id as AccessTypeId })}
              activeOpacity={0.75}
            >
              <Text style={[s.pillText, draft.accessType === a.id && s.pillTextSelected]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
  pill: {
    paddingHorizontal: 20,
    paddingVertical:   10,
    borderRadius:      20,
    backgroundColor:   COLORS.navyLight,
    borderWidth:       1.5,
    borderColor:       'transparent',
  },
  pillSelected:      { borderColor: COLORS.seafoam },
  pillText:          { color: COLORS.textSecondary, fontWeight: '500', fontSize: 14 },
  pillTextSelected:  { color: COLORS.seafoam },
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
