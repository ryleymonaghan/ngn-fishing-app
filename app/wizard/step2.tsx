import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, INSHORE_SPECIES, OFFSHORE_SPECIES, SPECIAL_PACKAGES, ROUTES } from '@constants/index';
import { useWizardStore } from '@stores/index';

export default function WizardStep2() {
  const router = useRouter();
  const { draft, updateDraft, setStep } = useWizardStore();

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

  const handleNext = () => {
    setStep(3);
    router.push(ROUTES.WIZARD.STEP_3 as any);
  };

  const speciesList = draft.isOffshore ? OFFSHORE_SPECIES : INSHORE_SPECIES;
  const canProceed  = draft.species.length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.stepLabel}>STEP 2 OF 3</Text>
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

        {/* Next */}
        <TouchableOpacity
          style={[s.next, !canProceed && s.nextDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={s.nextText}>Next: Choose Bait →</Text>
        </TouchableOpacity>

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
    backgroundColor: COLORS.navyLight,
    borderRadius:    10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth:     1.5,
    borderColor:     'transparent',
    minWidth:        '45%',
    flex:            1,
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
  next:         { backgroundColor: COLORS.seafoam, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  nextDisabled: { opacity: 0.4 },
  nextText:     { fontSize: 16, fontWeight: '700', color: COLORS.navy },
});
