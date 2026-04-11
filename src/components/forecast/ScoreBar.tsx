// ─────────────────────────────────────────────
// ScoreBar — Reusable horizontal percentage bar
// ─────────────────────────────────────────────

import { View, StyleSheet } from 'react-native';
import { COLORS } from '@constants/index';

interface ScoreBarProps {
  value: number;    // 0–100
  color?: string;
  height?: number;
}

export function ScoreBar({ value, color, height = 6 }: ScoreBarProps) {
  const barColor = color ?? (
    value >= 60 ? COLORS.success :
    value >= 35 ? COLORS.warning :
    COLORS.textMuted
  );

  return (
    <View style={[s.track, { height }]}>
      <View
        style={[s.fill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: barColor, height }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flex: 1,
    backgroundColor: `${COLORS.white}10`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 3,
  },
});
