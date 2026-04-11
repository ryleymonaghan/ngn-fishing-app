import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, ROUTES } from '@constants/index';
import { useReportStore } from '@stores/index';
import type { FishingReport } from '@app-types/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

export default function ReportsScreen() {
  const router  = useRouter();
  const { reports } = useReportStore();

  const openReport = (report: FishingReport) => {
    router.push(`/report/${report.id}` as any);
  };

  const startNewReport = () => {
    router.push(ROUTES.WIZARD.STEP_1 as any);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* ── Generate New Report CTA ── */}
      <TouchableOpacity style={s.generateBtn} onPress={startNewReport} activeOpacity={0.85}>
        <Text style={s.generateIcon}>▶</Text>
        <View style={s.generateTextWrap}>
          <Text style={s.generateTitle}>GENERATE NEW REPORT</Text>
          <Text style={s.generateSub}>Answer a few questions for a custom AI fishing plan</Text>
        </View>
        <Text style={s.generateArrow}>→</Text>
      </TouchableOpacity>

      {/* ── Past Reports ── */}
      {reports.length > 0 && (
        <Text style={s.sectionLabel}>PAST REPORTS</Text>
      )}

      {reports.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No reports yet</Text>
          <Text style={s.emptyText}>Hit the button above to generate your first AI fishing report.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => openReport(item)} activeOpacity={0.8}>
              <Text style={s.date}>
                {new Date(item.generatedAt).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </Text>
              <Text style={s.species}>
                {item.species.map((s) => s.speciesName).join(' · ')}
              </Text>
              <Text style={s.location}>{item.conditions.location.label}</Text>
              <Text style={s.solunar}>{item.conditions.solunar.label} solunar</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.navy },

  // ── Generate CTA ──
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.seafoam,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  generateIcon: {
    fontSize: 20,
    color: '#060E1A',
    marginRight: 12,
  },
  generateTextWrap: { flex: 1 },
  generateTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  generateSub: {
    fontSize: 11,
    color: 'rgba(6,14,26,0.6)',
    marginTop: 2,
  },
  generateArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#060E1A',
    marginLeft: 8,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },

  list:        { padding: 20, paddingTop: 0, gap: 12 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptyText:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: COLORS.navyLight,
    borderRadius:    12,
    padding:         16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.seafoam,
  },
  date:     { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  species:  { fontSize: 16, fontWeight: '600', color: COLORS.white },
  location: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  solunar:  { fontSize: 11, color: COLORS.seafoam, marginTop: 6 },
});
