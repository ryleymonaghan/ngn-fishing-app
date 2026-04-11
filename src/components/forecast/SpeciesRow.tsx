// ─────────────────────────────────────────────
// SpeciesRow — Species name + probability bar + percentage
// ─────────────────────────────────────────────

import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@constants/index';
import { ScoreBar } from './ScoreBar';
import type { SpeciesForecast } from '@app-types/index';

interface SpeciesRowProps {
  species: SpeciesForecast;
}

export function SpeciesRow({ species }: SpeciesRowProps) {
  const isOutOfSeason = species.factors.season === 0;
  const probColor =
    species.catchProbability >= 60 ? COLORS.success :
    species.catchProbability >= 35 ? COLORS.warning :
    COLORS.textMuted;

  return (
    <View style={s.row}>
      <Text style={s.name} numberOfLines={1}>{species.speciesName}</Text>
      {isOutOfSeason ? (
        <View style={s.badgeWrap}>
          <Text style={s.badge}>OUT OF SEASON</Text>
        </View>
      ) : (
        <>
          <View style={s.barWrap}>
            <ScoreBar value={species.catchProbability} />
          </View>
          <Text style={[s.pct, { color: probColor }]}>
            {species.catchProbability}%
          </Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.white}08`,
  },
  name: {
    width: 120,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  barWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  pct: {
    width: 40,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  badgeWrap: {
    flex: 1,
    marginLeft: 10,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    backgroundColor: `${COLORS.white}08`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
