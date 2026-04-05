import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@constants/index';
import { FISHING_RIGS, RIG_CATEGORIES, type FishingRig } from '@constants/rigs';
import { FISHING_KNOTS } from '@constants/knots';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });
const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';

const DIFF_COLORS: Record<string, string> = {
  beginner: COLORS.success,
  intermediate: COLORS.warning,
  advanced: COLORS.danger,
};

// Map access type IDs to display labels
const ACCESS_LABELS: Record<string, string> = {
  boat: 'Boat', kayak: 'Kayak', shore: 'Shore', surf: 'Surf', dock: 'Dock',
};

export default function RigGuideScreen() {
  const router = useRouter();
  const [selectedRig, setSelectedRig] = useState<FishingRig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filteredRigs = filterCategory
    ? FISHING_RIGS.filter(r => r.category === filterCategory)
    : FISHING_RIGS;

  const handleSelectRig = useCallback((rig: FishingRig) => {
    setSelectedRig(rig);
    setCurrentStep(0);
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setSelectedRig(null);
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (selectedRig && currentStep < selectedRig.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [selectedRig, currentStep]);

  // Look up knot name for deep-link display
  const getKnotName = (knotId: string): string | null => {
    const knot = FISHING_KNOTS.find(k => k.id === knotId);
    return knot?.name ?? null;
  };

  // ── Step-by-Step View ─────────────────────
  if (selectedRig) {
    const step = selectedRig.steps[currentStep];
    const total = selectedRig.steps.length;
    const isFirst = currentStep === 0;
    const isLast = currentStep === total - 1;
    const progress = ((currentStep + 1) / total) * 100;

    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.stepContent}>

          {/* Header */}
          <TouchableOpacity onPress={() => setSelectedRig(null)} activeOpacity={0.7}>
            <Text style={s.backLink}>← ALL RIGS</Text>
          </TouchableOpacity>

          <Text style={s.rigTitle}>{selectedRig.name}</Text>
          <View style={s.metaRow}>
            <View style={[s.diffBadge, { backgroundColor: DIFF_COLORS[selectedRig.difficulty] }]}>
              <Text style={s.diffBadgeText}>{selectedRig.difficulty.toUpperCase()}</Text>
            </View>
            <Text style={s.categoryText}>{selectedRig.categoryLabel.toUpperCase()}</Text>
          </View>

          {/* Components list */}
          <View style={s.componentsBox}>
            <Text style={s.componentsTitle}>COMPONENTS NEEDED</Text>
            {selectedRig.components.map((comp, i) => (
              <View key={i} style={s.componentRow}>
                <Text style={s.componentBullet}>•</Text>
                <Text style={s.componentText}>{comp}</Text>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={s.progressLabel}>STEP {currentStep + 1} OF {total}</Text>

          {/* Current step card */}
          <View style={s.stepCard}>
            <Text style={s.stepNumber}>{step.step}</Text>
            <Text style={s.stepInstruction}>{step.instruction}</Text>

            {/* Knot deep-link */}
            {step.knotId && (
              <TouchableOpacity
                style={s.knotLink}
                onPress={() => {
                  // Navigate to knots tab — the knot guide will open
                  router.push('/(tabs)/knots' as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={s.knotLinkLabel}>KNOT NEEDED</Text>
                <Text style={s.knotLinkName}>{getKnotName(step.knotId) ?? step.knotId} →</Text>
              </TouchableOpacity>
            )}

            {step.tip && (
              <View style={s.tipBox}>
                <Text style={s.tipLabel}>PRO TIP</Text>
                <Text style={s.tipText}>{step.tip}</Text>
              </View>
            )}
          </View>

          {/* Navigation buttons */}
          <View style={s.navRow}>
            <TouchableOpacity
              style={[s.navBtn, s.navBtnBack, isFirst && s.navBtnDisabled]}
              onPress={handleBack}
              disabled={isFirst}
              activeOpacity={0.8}
            >
              <Text style={[s.navBtnText, isFirst && s.navBtnTextDisabled]}>← BACK</Text>
            </TouchableOpacity>

            {!isLast ? (
              <TouchableOpacity
                style={[s.navBtn, s.navBtnNext]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={s.navBtnNextText}>NEXT →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.navBtn, s.navBtnDone]}
                onPress={() => setSelectedRig(null)}
                activeOpacity={0.8}
              >
                <Text style={s.navBtnNextText}>DONE ✓</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Step overview — tap any step to jump */}
          <Text style={s.overviewLabel}>ALL STEPS — TAP TO JUMP</Text>
          {selectedRig.steps.map((st, i) => (
            <TouchableOpacity
              key={i}
              style={[s.overviewRow, i === currentStep && s.overviewRowActive]}
              onPress={() => setCurrentStep(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.overviewNum, i === currentStep && s.overviewNumActive]}>{st.step}</Text>
              <Text
                style={[s.overviewText, i === currentStep && s.overviewTextActive, i < currentStep && s.overviewTextDone]}
                numberOfLines={2}
              >
                {st.instruction}
              </Text>
              {i < currentStep && <Text style={s.overviewCheck}>✓</Text>}
            </TouchableOpacity>
          ))}

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Rig List View ─────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.listContent}>

        <Text style={s.screenTitle}>RIG GUIDE</Text>
        <Text style={s.screenSub}>11 essential rigs — step-by-step assembly</Text>

        {/* Category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
          <TouchableOpacity
            style={[s.filterPill, !filterCategory && s.filterPillActive]}
            onPress={() => setFilterCategory(null)}
            activeOpacity={0.75}
          >
            <Text style={[s.filterText, !filterCategory && s.filterTextActive]}>ALL</Text>
          </TouchableOpacity>
          {RIG_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.filterPill, filterCategory === cat.id && s.filterPillActive]}
              onPress={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterText, filterCategory === cat.id && s.filterTextActive]}>
                {cat.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Rig cards */}
        {filteredRigs.map(rig => (
          <TouchableOpacity
            key={rig.id}
            style={s.rigCard}
            onPress={() => handleSelectRig(rig)}
            activeOpacity={0.8}
          >
            <View style={s.rigCardHeader}>
              <Text style={s.rigCardName}>{rig.name}</Text>
              <View style={[s.diffBadge, { backgroundColor: DIFF_COLORS[rig.difficulty] }]}>
                <Text style={s.diffBadgeText}>{rig.difficulty.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={s.rigCardCategory}>{rig.categoryLabel}</Text>
            <Text style={s.rigCardUse} numberOfLines={2}>{rig.description}</Text>

            {/* Access type tags */}
            <View style={s.tagRow}>
              {rig.accessTypes.map(at => (
                <View key={at} style={s.accessTag}>
                  <Text style={s.accessTagText}>{ACCESS_LABELS[at] ?? at}</Text>
                </View>
              ))}
            </View>

            <View style={s.rigCardFooter}>
              <Text style={s.rigCardParts}>{rig.components.length} parts</Text>
              <Text style={s.rigCardSteps}>{rig.steps.length} steps →</Text>
            </View>
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060E1A' },
  listContent: { padding: 20, paddingBottom: 48 },
  stepContent: { padding: 20, paddingBottom: 48 },

  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
    letterSpacing: 3,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },

  // ── Filters ────────────────────────
  filterScroll: { marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    marginRight: 8,
  },
  filterPillActive: { borderColor: COLORS.seafoam, backgroundColor: `${COLORS.seafoam}15` },
  filterText: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 1 },
  filterTextActive: { color: COLORS.seafoam },

  // ── Rig cards ──────────────────────
  rigCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 10,
  },
  rigCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rigCardName: { fontSize: 15, fontWeight: '700', color: COLORS.white, fontFamily: MONO, flex: 1, marginRight: 8 },
  rigCardCategory: { fontSize: 10, color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 1, marginBottom: 6 },
  rigCardUse: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  accessTag: {
    backgroundColor: `${COLORS.ocean}33`,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accessTagText: { fontSize: 9, fontWeight: '700', color: COLORS.ocean, fontFamily: MONO, letterSpacing: 0.5 },
  rigCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rigCardParts: { fontSize: 10, color: COLORS.textMuted, fontFamily: MONO },
  rigCardSteps: { fontSize: 10, color: COLORS.seafoam, fontFamily: MONO, fontWeight: '600' },

  // ── Difficulty badges ──────────────
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  diffBadgeText: { fontSize: 8, fontWeight: '800', color: '#060E1A', fontFamily: MONO, letterSpacing: 1 },

  // ── Step view ──────────────────────
  backLink: { fontSize: 12, color: COLORS.seafoam, fontFamily: MONO, fontWeight: '600', marginBottom: 16 },
  rigTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, fontFamily: MONO, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  categoryText: { fontSize: 10, color: COLORS.textMuted, fontFamily: MONO, fontWeight: '700', letterSpacing: 1 },

  // ── Components box ─────────────────
  componentsBox: {
    backgroundColor: `${COLORS.navy}88`,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 12,
    marginBottom: 20,
  },
  componentsTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 8 },
  componentRow: { flexDirection: 'row', marginBottom: 4 },
  componentBullet: { color: COLORS.seafoam, marginRight: 8, fontSize: 12 },
  componentText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  progressTrack: { height: 3, backgroundColor: GRID_LINE, marginBottom: 6 },
  progressFill: { height: 3, backgroundColor: COLORS.seafoam },
  progressLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 20 },

  stepCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 20,
    marginBottom: 20,
  },
  stepNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: `${COLORS.seafoam}33`,
    fontFamily: MONO,
    position: 'absolute',
    top: 10,
    right: 14,
  },
  stepInstruction: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 24,
    paddingRight: 30,
  },

  // ── Knot deep-link ─────────────────
  knotLink: {
    backgroundColor: `${COLORS.seafoam}15`,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.seafoam,
    padding: 10,
    marginTop: 12,
  },
  knotLinkLabel: { fontSize: 9, fontWeight: '800', color: COLORS.seafoam, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2 },
  knotLinkName: { fontSize: 13, fontWeight: '700', color: COLORS.seafoam },

  tipBox: {
    backgroundColor: `${COLORS.warning}15`,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    padding: 10,
    marginTop: 12,
  },
  tipLabel: { fontSize: 9, fontWeight: '800', color: COLORS.warning, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 },
  tipText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // ── Nav buttons ────────────────────
  navRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  navBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  navBtnBack: { backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GRID_LINE },
  navBtnNext: { backgroundColor: COLORS.seafoam },
  navBtnDone: { backgroundColor: COLORS.success },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, fontFamily: MONO, letterSpacing: 1 },
  navBtnTextDisabled: { color: COLORS.textMuted },
  navBtnNextText: { fontSize: 13, fontWeight: '800', color: '#060E1A', fontFamily: MONO, letterSpacing: 1 },

  // ── Step overview ──────────────────
  overviewLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 10 },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: GRID_LINE,
  },
  overviewRowActive: { backgroundColor: `${COLORS.seafoam}0A`, borderLeftWidth: 3, borderLeftColor: COLORS.seafoam },
  overviewNum: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, fontFamily: MONO, width: 28 },
  overviewNumActive: { color: COLORS.seafoam },
  overviewText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  overviewTextActive: { color: COLORS.white },
  overviewTextDone: { color: COLORS.textMuted },
  overviewCheck: { fontSize: 12, color: COLORS.success, marginLeft: 8 },
});
