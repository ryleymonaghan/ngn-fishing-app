import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/index';
import { useReportStore } from '@stores/index';
import type { FishingReport } from '@app-types/index';

export default function ReportsScreen() {
  const router  = useRouter();
  const { reports } = useReportStore();

  const openReport = (report: FishingReport) => {
    router.push(`/report/${report.id}` as any);
  };

  if (reports.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No reports yet</Text>
          <Text style={s.emptyText}>Generate your first fishing report from the Conditions tab.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.navy },
  list:        { padding: 20, gap: 12 },
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
