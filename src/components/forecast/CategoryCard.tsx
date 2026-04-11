// ─────────────────────────────────────────────
// CategoryCard — Expandable accordion (Inshore/Trolling/Reef)
// ─────────────────────────────────────────────

import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { COLORS } from '@constants/index';
import { SpeciesRow } from './SpeciesRow';
import { ScoreBar } from './ScoreBar';
import type { CategoryForecast } from '@app-types/index';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryCardProps {
  category: CategoryForecast;
  expanded: boolean;
  onToggle: () => void;
}

export function CategoryCard({ category, expanded, onToggle }: CategoryCardProps) {
  const scoreColor =
    category.topScore >= 60 ? COLORS.success :
    category.topScore >= 35 ? COLORS.warning :
    COLORS.textMuted;

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.header} onPress={handleToggle} activeOpacity={0.7}>
        <View style={s.headerLeft}>
          <Text style={s.categoryName}>{category.categoryName}</Text>
          <Text style={s.speciesCount}>
            {category.species.length} species
          </Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.scoreBadge}>
            <Text style={[s.scoreText, { color: scoreColor }]}>{category.topScore}%</Text>
          </View>
          <Text style={s.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.body}>
          {category.species.map(sp => (
            <SpeciesRow key={sp.speciesId} species={sp} />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  headerLeft: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  speciesCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreBadge: {
    backgroundColor: `${COLORS.white}08`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: `${COLORS.white}08`,
  },
});
