import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/index';
import { FISHING_KNOTS, KNOT_CATEGORIES, type FishingKnot } from '@constants/knots';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });
const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';

// ── Difficulty badge colors ──────────────────
const DIFF_COLORS: Record<string, string> = {
  beginner: COLORS.success,
  intermediate: COLORS.warning,
  advanced: COLORS.danger,
};

export default function KnotGuideScreen() {
  const [selectedKnot, setSelectedKnot] = useState<FishingKnot | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filteredKnots = filterCategory
    ? FISHING_KNOTS.filter(k => k.category === filterCategory)
    : FISHING_KNOTS;

  const handleSelectKnot = useCallback((knot: FishingKnot) => {
    setSelectedKnot(knot);
    setCurrentStep(0);
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setSelectedKnot(null);
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (selectedKnot && currentStep < selectedKnot.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [selectedKnot, currentStep]);

  // ── Step-by-Step View ─────────────────────
  if (selectedKnot) {
    const step = selectedKnot.steps[currentStep];
    const total = selectedKnot.steps.length;
    const isFirst = currentStep === 0;
    const isLast = currentStep === total - 1;
    const progress = ((currentStep + 1) / total) * 100;

    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.stepContent}>

          {/* Header */}
          <TouchableOpacity onPress={() => setSelectedKnot(null)} activeOpacity={0.7}>
            <Text style={s.backLink}>← ALL KNOTS</Text>
          </TouchableOpacity>

          <Text style={s.knotTitle}>{selectedKnot.name}</Text>
          <View style={s.metaRow}>
            <View style={[s.diffBadge, { backgroundColor: DIFF_COLORS[selectedKnot.difficulty] }]}>
              <Text style={s.diffBadgeText}>{selectedKnot.difficulty.toUpperCase()}</Text>
            </View>
            <Text style={s.strengthText}>{selectedKnot.strengthPct}% STRENGTH</Text>
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
                onPress={() => setSelectedKnot(null)}
                activeOpacity={0.8}
              >
                <Text style={s.navBtnNextText}>DONE ✓</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Step overview — tap any step to jump */}
          <Text style={s.overviewLabel}>ALL STEPS — TAP TO JUMP</Text>
          {selectedKnot.steps.map((st, i) => (
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

  // ── Knot List View ────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.listContent}>

        <Text style={s.screenTitle}>KNOT GUIDE</Text>
        <Text style={s.screenSub}>14 essential knots — step by step</Text>

        {/* Category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
          <TouchableOpacity
            style={[s.filterPill, !filterCategory && s.filterPillActive]}
            onPress={() => setFilterCategory(null)}
            activeOpacity={0.75}
          >
            <Text style={[s.filterText, !filterCategory && s.filterTextActive]}>ALL</Text>
          </TouchableOpacity>
          {KNOT_CATEGORIES.map(cat => (
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

        {/* Knot cards */}
        {filteredKnots.map(knot => (
          <TouchableOpacity
            key={knot.id}
            style={s.knotCard}
            onPress={() => handleSelectKnot(knot)}
            activeOpacity={0.8}
          >
            <View style={s.knotCardHeader}>
              <Text style={s.knotCardName}>{knot.name}</Text>
              <View style={[s.diffBadge, { backgroundColor: DIFF_COLORS[knot.difficulty] }]}>
                <Text style={s.diffBadgeText}>{knot.difficulty.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={s.knotCardCategory}>{knot.categoryLabel}</Text>
            <Text style={s.knotCardUse} numberOfLines={2}>{knot.useCases}</Text>
            <View style={s.knotCardFooter}>
              <Text style={s.knotCardStrength}>{knot.strengthPct}% strength</Text>
              <Text style={s.knotCardSteps}>{knot.steps.length} steps →</Text>
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

  // ── Knot cards ─────────────────────
  knotCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 10,
  },
  knotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  knotCardName: { fontSize: 16, fontWeight: '700', color: COLORS.white, fontFamily: MONO },
  knotCardCategory: { fontSize: 10, color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 1, marginBottom: 6 },
  knotCardUse: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  knotCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  knotCardStrength: { fontSize: 10, color: COLORS.seafoam, fontFamily: MONO, fontWeight: '600' },
  knotCardSteps: { fontSize: 10, color: COLORS.seafoam, fontFamily: MONO, fontWeight: '600' },

  // ── Difficulty badges ──────────────
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  diffBadgeText: { fontSize: 8, fontWeight: '800', color: '#060E1A', fontFamily: MONO, letterSpacing: 1 },

  // ── Step view ──────────────────────
  backLink: { fontSize: 12, color: COLORS.seafoam, fontFamily: MONO, fontWeight: '600', marginBottom: 16 },
  knotTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, fontFamily: MONO, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  strengthText: { fontSize: 10, color: COLORS.seafoam, fontFamily: MONO, fontWeight: '700', letterSpacing: 1 },

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
  tipBox: {
    backgroundColor: `${COLORS.warning}15`,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    padding: 10,
    marginTop: 14,
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
