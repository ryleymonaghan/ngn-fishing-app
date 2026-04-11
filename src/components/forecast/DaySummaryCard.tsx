// ─────────────────────────────────────────────
// DaySummaryCard — Weather/tide/solunar for selected day
// ─────────────────────────────────────────────

import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@constants/index';
import { ScoreBar } from './ScoreBar';
import type { DailyFishingForecast } from '@app-types/index';

interface DaySummaryCardProps {
  day: DailyFishingForecast;
}

export function DaySummaryCard({ day }: DaySummaryCardProps) {
  const scoreColor =
    day.overallScore >= 60 ? COLORS.success :
    day.overallScore >= 35 ? COLORS.seafoam :
    day.overallScore >= 20 ? COLORS.warning :
    COLORS.textMuted;

  return (
    <View style={s.card}>
      {/* Overall score */}
      <View style={s.scoreRow}>
        <Text style={[s.scoreBig, { color: scoreColor }]}>{day.overallScore}%</Text>
        <View style={s.scoreRight}>
          <Text style={[s.scoreLabel, { color: scoreColor }]}>{day.overallLabel.toUpperCase()}</Text>
          <View style={s.barWrap}>
            <ScoreBar value={day.overallScore} color={scoreColor} height={4} />
          </View>
        </View>
      </View>

      {/* Quick stats row */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statValue}>{day.weather.tempHigh}°/{day.weather.tempLow}°</Text>
          <Text style={s.statLabel}>TEMP</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{day.weather.windSpeed} mph</Text>
          <Text style={s.statLabel}>WIND {day.weather.windCardinal}</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{day.weather.rainChance}%</Text>
          <Text style={s.statLabel}>RAIN</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{day.solunar.rating}</Text>
          <Text style={s.statLabel}>SOLUNAR</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{day.tideEvents.length}</Text>
          <Text style={s.statLabel}>TIDES</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBig: {
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginRight: 14,
  },
  scoreRight: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  barWrap: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: `${COLORS.white}10`,
    paddingTop: 10,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
