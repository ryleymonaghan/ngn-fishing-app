import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, INSHORE_SPECIES, OFFSHORE_SPECIES, SPECIAL_PACKAGES, FREE_REPORT_LIMIT, PRICING } from '@constants/index';
import { useWizardStore, useReportStore, useConditionsStore, useAuthStore } from '@stores/index';
import { startCheckout } from '@services/stripeService';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

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

  const [customSpecies, setCustomSpecies] = useState('');
  const [aiRecommending, setAiRecommending] = useState(false);

  const speciesList = draft.isOffshore ? OFFSHORE_SPECIES : INSHORE_SPECIES;
  const canGenerate = draft.species.length > 0 || customSpecies.trim().length > 0;

  // "Tell me what to target" — auto-select species based on conditions
  const handleAiRecommend = () => {
    setAiRecommending(true);
    // Use conditions data to recommend species for the selected date/time
    const conds = conditions;
    const month = new Date(draft.date).getMonth(); // 0-11
    const recommended: string[] = [];

    if (draft.isOffshore) {
      // Offshore recommendations by season
      if (month >= 3 && month <= 9) recommended.push('mahi', 'wahoo');
      if (month >= 10 || month <= 3) recommended.push('sailfish');
      recommended.push('yellowfin', 'gag_grouper');
      if (month >= 5 && month <= 8) recommended.push('red_snapper');
    } else {
      // Inshore — always good: redfish, trout, flounder
      recommended.push('redfish', 'speckled_trout');
      if (month >= 8 || month <= 1) recommended.push('flounder'); // fall flounder run
      if (month >= 1 && month <= 4) recommended.push('sheepshead'); // spring best
      if (month >= 3 && month <= 5) recommended.push('cobia'); // spring migration
      if (month >= 3 && month <= 9) recommended.push('spanish_mackerel');

      // Wind-based: if calm, add tarpon
      if (conds?.weather?.windSpeed && conds.weather.windSpeed < 10) {
        recommended.push('tarpon');
      }
    }

    updateDraft({ species: [...new Set(recommended)] });
    setAiRecommending(false);
  };

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

        {/* AI Recommend */}
        <TouchableOpacity
          style={s.aiRecommend}
          onPress={handleAiRecommend}
          activeOpacity={0.85}
          disabled={aiRecommending}
        >
          {aiRecommending ? (
            <ActivityIndicator color="#060E1A" size="small" />
          ) : (
            <>
              <Text style={s.aiRecommendText}>TELL ME WHAT TO TARGET</Text>
              <Text style={s.aiRecommendSub}>
                AI picks the best species for {draft.date} based on conditions
              </Text>
            </>
          )}
        </TouchableOpacity>

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

        {/* Custom species input */}
        <Text style={s.sectionLabel}>OTHER SPECIES NOT LISTED</Text>
        <TextInput
          style={s.customInput}
          placeholder="Type a species name..."
          placeholderTextColor={COLORS.textMuted}
          value={customSpecies}
          onChangeText={setCustomSpecies}
        />

        {/* Selection Count */}
        {(draft.species.length > 0 || customSpecies.trim()) && (
          <Text style={s.selectionCount}>
            {draft.species.length}{customSpecies.trim() ? ' + 1 custom' : ''} species selected
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
  aiRecommend: {
    backgroundColor: COLORS.seafoam,
    borderRadius:    12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems:      'center',
    marginTop:       16,
    marginBottom:    8,
  },
  aiRecommendText: {
    fontSize:      13,
    fontWeight:    '800',
    color:         '#060E1A',
    letterSpacing: 2,
  },
  aiRecommendSub: {
    fontSize:  11,
    color:     '#060E1A',
    opacity:   0.6,
    marginTop: 3,
  },
  customInput: {
    backgroundColor:   COLORS.navyLight,
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          14,
    color:             COLORS.white,
    borderWidth:       1,
    borderColor:       `${COLORS.seafoam}30`,
  },
});
