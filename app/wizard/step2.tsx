import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, INSHORE_SPECIES, OFFSHORE_SPECIES, SPECIAL_PACKAGES, FREE_REPORT_LIMIT, PRICING } from '@constants/index';
import { useWizardStore, useReportStore, useConditionsStore, useAuthStore } from '@stores/index';
import { startCheckout } from '@services/stripeService';

export default function WizardStep2() {
  const router = useRouter();
  const { draft, updateDraft, resetDraft } = useWizardStore();
  const { generateReport, isGenerating, error } = useReportStore();
  const { conditions } = useConditionsStore();

  const toggleSpecies = (id: string) => {
    const current = draft.species;
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    updateDraft({ species: next });
  };

  const selectPackage = (pkg: typeof SPECIAL_PACKAGES[number]) => {
    updateDraft({ species: [...pkg.species] });
  };

  const toggleOffshore = (val: boolean) => {
    updateDraft({ isOffshore: val, species: [] });
  };

  const { canGenerateReport } = useAuthStore();

  const handleGenerate = async () => {
    if (!conditions) return;

    // Paywall check — free users get FREE_REPORT_LIMIT reports
    if (!canGenerateReport()) {
      Alert.alert(
        'Upgrade to Pro',
        `You've used all ${FREE_REPORT_LIMIT} free reports. Upgrade to NGN Pro for unlimited reports, relief shading, GPS spots, and more.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: `Monthly · $${PRICING.MONTHLY}/mo`,
            onPress: () => startCheckout('monthly').catch(() => {}),
          },
          {
            text: `Annual · $${PRICING.ANNUAL}/yr (Save 50%)`,
            style: 'default',
            onPress: () => startCheckout('annual').catch(() => {}),
          },
        ]
      );
      return;
    }

    try {
      await generateReport(draft, conditions);
      resetDraft();
      router.replace('/report/latest' as any);
    } catch {
      // error shown in UI
    }
  };

  const speciesList = draft.isOffshore ? OFFSHORE_SPECIES : INSHORE_SPECIES;
  const canGenerate = draft.species.length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.stepLabel}>STEP 2 OF 2</Text>
        <Text style={s.title}>What are you targeting?</Text>

        {/* Inshore / Offshore Toggle */}
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Inshore</Text>
          <Switch
            value={draft.isOffshore}
            onValueChange={toggleOffshore}
            trackColor={{ false: COLORS.navyLight, true: COLORS.ocean }}
            thumbColor={COLORS.seafoam}
          />
          <Text style={s.toggleLabel}>Offshore</Text>
        </View>

        {/* Special Packages (inshore only) */}
        {!draft.isOffshore && (
          <>
            <Text style={s.sectionLabel}>SPECIAL PACKAGES</Text>
            {SPECIAL_PACKAGES.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={s.packageCard}
                onPress={() => selectPackage(pkg)}
                activeOpacity={0.8}
              >
                <Text style={s.packageName}>{pkg.name}</Text>
                <Text style={s.packageDesc}>{pkg.description}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Species Grid */}
        <Text style={s.sectionLabel}>
          {draft.isOffshore ? 'OFFSHORE SPECIES' : 'INSHORE SPECIES'}
        </Text>
        <View style={s.grid}>
          {speciesList.map((sp) => {
            const selected = draft.species.includes(sp.id);
            return (
              <TouchableOpacity
                key={sp.id}
                style={[s.speciesChip, selected && s.speciesChipSelected]}
                onPress={() => toggleSpecies(sp.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.speciesName, selected && s.speciesNameSelected]}>
                  {sp.name}
                </Text>
                <Text style={[s.speciesSeason, selected && s.speciesSeasonSelected]}>
                  {sp.season}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selection Count */}
        {draft.species.length > 0 && (
          <Text style={s.selectionCount}>
            {draft.species.length} species selected
          </Text>
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
            Your AI guide is analyzing tides, solunar tables, and current conditions
            to recommend the best bait, rigs, and spots. This takes about 15–20 seconds.
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.navy },
  content:      { padding: 24, paddingBottom: 48 },
  stepLabel:    { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
  title:        { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 24 },
  sectionLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  toggleLabel:  { fontSize: 15, color: COLORS.white, fontWeight: '500' },
  packageCard: {
    backgroundColor: COLORS.ocean,
    borderRadius:    12,
    padding:         14,
    marginBottom:    10,
  },
  packageName:  { fontSize: 15, fontWeight: '700', color: COLORS.white },
  packageDesc:  { fontSize: 12, color: COLORS.sky, marginTop: 3 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speciesChip: {
    backgroundColor:   COLORS.navyLight,
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderWidth:       1.5,
    borderColor:       'transparent',
    minWidth:          '45%',
    flex:              1,
  },
  speciesChipSelected:   { borderColor: COLORS.seafoam, backgroundColor: `${COLORS.seafoam}18` },
  speciesName:           { fontSize: 14, fontWeight: '600', color: COLORS.white },
  speciesNameSelected:   { color: COLORS.seafoam },
  speciesSeason:         { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  speciesSeasonSelected: { color: COLORS.textSecondary },
  selectionCount: {
    fontSize:   13,
    color:      COLORS.seafoam,
    textAlign:  'center',
    marginTop:  16,
  },
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
