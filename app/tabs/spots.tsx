import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/index';

export default function SpotsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.title}>Saved Spots</Text>
        <Text style={s.sub}>Your saved GPS fishing spots will appear here.</Text>
        <Text style={s.sub}>Coming in v0.2.0</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:  { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 10 },
  sub:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
