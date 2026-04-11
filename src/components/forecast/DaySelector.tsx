// ─────────────────────────────────────────────
// DaySelector — Horizontal 5-day pill strip
// ─────────────────────────────────────────────

import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '@constants/index';
import type { DailyFishingForecast } from '@app-types/index';

interface DaySelectorProps {
  forecasts: DailyFishingForecast[];
  selectedDay: number;
  onSelect: (index: number) => void;
}

export function DaySelector({ forecasts, selectedDay, onSelect }: DaySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.container}
    >
      {forecasts.map((day, i) => {
        const isSelected = i === selectedDay;
        const scoreColor =
          day.overallScore >= 60 ? COLORS.success :
          day.overallScore >= 35 ? COLORS.warning :
          COLORS.textMuted;

        // Short day label: "Today", "Tmrw", "Wed", etc.
        const shortLabel = day.dayLabel === 'Today' ? 'TODAY'
          : day.dayLabel === 'Tomorrow' ? 'TMRW'
          : day.dayLabel.slice(0, 3).toUpperCase();

        return (
          <TouchableOpacity
            key={day.date}
            style={[s.pill, isSelected && s.pillSelected]}
            onPress={() => onSelect(i)}
            activeOpacity={0.7}
          >
            <Text style={[s.dayLabel, isSelected && s.dayLabelSelected]}>
              {shortLabel}
            </Text>
            <Text style={[s.score, { color: isSelected ? COLORS.seafoam : scoreColor }]}>
              {day.overallScore}%
            </Text>
            <Text style={[s.overallLabel, isSelected && s.overallLabelSelected]}>
              {day.overallLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 64,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillSelected: {
    borderColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}10`,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: COLORS.seafoam,
  },
  score: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  overallLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  overallLabelSelected: {
    color: COLORS.seafoam,
  },
});
