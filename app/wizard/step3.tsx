import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, LIVE_BAIT, FROZEN_BAIT, ARTIFICIAL_BAIT } from '@constants/index';
import { useWizardStore, useReportStore, useConditionsStore } from '@stores/index';

type BaitType = 'live' | 'frozen' | 'artificial' | 'catching_own';

const BAIT_CATEGORIES: { id: BaitType; label: string }[] = [
  { id: 'catching_own', label: 'Catching My Own'  },
  { id: 'live',         label: 'Live Bait'         },
  { id: 'frozen',       label: 'Frozen / Cut Bait' },
  { id: 'artificial',   label: 'Artificials'        },
];

export default function WizardStep3() {
  const router = useRouter();
  const { draft, updateDraft, resetDraft } = useWizardStore();
  const { generateReport, isGenerating, error } = useReportStore();
  const { conditions } = useConditionsStore();

  const isOffshore = draft.isOffshore;
  const baitList =
    draft.baitType === 'live'         ? LIVE_BAIT.filter(b => isOffshore ? b.offshore : b.inshore) :
    draft.baitType === 'frozen'       ? FROZEN_BAIT.filter(b => isOffshore ? b.offshore : b.inshore) :
    draft.baitType === 'artificial'   ? ARTIFICIAL_BAIT.filter(b => isOffshore ? b.offshore : b.inshore) :
    [];

  const toggleBait = (id: string) => {
    const current = draft.baitIds;
    const next = current.includes(id)
      ? current.filter((b) => b !== id)
      : [...current, id];
    updateDraft({ baitIds: next });
  };

  const handleGenerate = async () => {
    if (!conditions) return;
    try {
      await generateReport(draft, conditions);
      resetDraft();
      router.replace('/report/latest' as any);
    } catch {
      // error shown in UI
    }
  };

  const canGenerate = draft.baitType === 'catching_own' || draft.baitIds.length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.stepLabel}>STEP 3 OF 3</Text>
        <Text style={s.title}>What bait do you have?</Text>

        {/* Bait Type Tabs */}
        <View style={s.tabRow}>
          {BAIT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.tab, draft.baitType === cat.id && s.tabActive]}
              onPress={() => updateDraft({ baitType: cat.id, baitIds: [] })}
              activeOpacity={0.75}
            >
              <Text style={[s.tabText, draft.baitType === cat.id && s.tabTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Catching Own Bait Info */}
        {draft.baitType === 'catching_own' && (
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Cast Net Bait Finder</Text>
            <Text style={s.infoText}>
              Your report will include GPS coordinates for finding live bait —
              including areas with diving birds, pelicans, and known bait schools.
              A cast net tutorial will be included.
            </Text>
          </View>
        )}

        {/* Bait Options */}
        {baitList.length > 0 && (
          <>
            <Text style={s.sectionLabel}>SELECT ALL THAT APPLY</Text>
            <View style={s.grid}>
              {baitList.map((bait) => {
                const selected = draft.baitIds.includes(bait.id);
                return (
                  <TouchableOpacity
                    key={bait.id}
                    style={[s.baitChip, selected && s.baitChipSelected]}
                    onPress={() => toggleBait(bait.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.baitName, selected && s.baitNameSelected]}>
                      {bait.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Error */}
        {error && (
          <View style={s.errorCard}>
            <Text style={s.errorText}>Report generation failed: {error}</Text>
          </View>
        )}

        {/* Generate CTA */}
        <TouchableOpacity
          style={[s.generate, (!canGenerate || isGenerating) && s.generateDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate || isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <View style={s.generatingRow}>
              <ActivityIndicator color={COLORS.navy} />
              <Text style={s.generateText}>  Generating your report...</Text>
            </View>
          ) : (
            <Text style={s.generateText}>Generate My Report →</Text>
          )}
        </TouchableOpacity>

        {isGenerating && (
          <Text style={s.generatingHint}>
            Your AI guide is analyzing tides, solunar tables, and current conditions.
            This takes about 15–20 seconds.
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.navy },
  content:         { padding: 24, paddingBottom: 48 },
  stepLabel:       { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
  title:           { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 24 },
  sectionLabel:    { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },
  tabRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      20,
    backgroundColor:   COLORS.navyLight,
    borderWidth:       1.5,
    borderColor:       'transparent',
  },
  tabActive:       { borderColor: COLORS.seafoam },
  tabText:         { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive:   { color: COLORS.seafoam },
  infoCard: {
    backgroundColor: `${COLORS.ocean}50`,
    borderRadius:    12,
    padding:         16,
    marginTop:       16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.seafoam,
  },
  infoTitle:       { fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 6 },
  infoText:        { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  baitChip: {
    backgroundColor:   COLORS.navyLight,
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderWidth:       1.5,
    borderColor:       'transparent',
  },
  baitChipSelected: { borderColor: COLORS.seafoam, backgroundColor: `${COLORS.seafoam}18` },
  baitName:         { fontSize: 14, color: COLORS.white },
  baitNameSelected: { color: COLORS.seafoam, fontWeight: '600' },
  errorCard:    { backgroundColor: `${COLORS.danger}22`, borderRadius: 10, padding: 14, marginTop: 16 },
  errorText:    { color: COLORS.danger, fontSize: 13 },
  generate: {
    backgroundColor: COLORS.seafoam,
    borderRadius:    14,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       32,
  },
  generateDisabled: { opacity: 0.4 },
  generatingRow:    { flexDirection: 'row', alignItems: 'center' },
  generateText:     { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  generatingHint: {
    textAlign:  'center',
    color:      COLORS.textMuted,
    fontSize:   12,
    marginTop:  12,
    lineHeight: 18,
  },
});
