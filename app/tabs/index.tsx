import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, ROUTES, APP_NAME, APP_TAGLINE, APP_INTRO, DEFAULT_LOCATION } from '@constants/index';
import { useConditionsStore } from '@stores/index';
import type { UserLocation } from '@app-types/index';

async function getUserLocation(): Promise<UserLocation> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(DEFAULT_LOCATION);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(DEFAULT_LOCATION),
        { timeout: 10000 },
      );
    });
  }
  // Native: use expo-location
  const Location = require('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return DEFAULT_LOCATION;
  const pos = await Location.getCurrentPositionAsync({});
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export default function ConditionsScreen() {
  const router     = useRouter();
  const { conditions, isLoading, error, fetchConditions, refresh } = useConditionsStore();

  useEffect(() => {
    getUserLocation().then(fetchConditions);
  }, []);

  const handleGenerateReport = () => {
    router.push(ROUTES.WIZARD.STEP_1 as any);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={COLORS.seafoam}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.appName}>{APP_NAME}</Text>
          <Text style={s.tagline}>{APP_TAGLINE}</Text>
          <Text style={s.intro}>{APP_INTRO}</Text>
        </View>

        {/* Loading */}
        {isLoading && !conditions && (
          <ActivityIndicator size="large" color={COLORS.seafoam} style={s.loader} />
        )}

        {/* Error */}
        {error && (
          <View style={s.errorCard}>
            <Text style={s.errorText}>Could not load conditions: {error}</Text>
          </View>
        )}

        {/* Conditions Cards */}
        {conditions && (
          <>
            {/* Tide Card */}
            <View style={s.card}>
              <Text style={s.cardLabel}>TIDE</Text>
              <Text style={s.cardValue}>
                {conditions.tides.currentHeight} ft — {conditions.tides.currentTrend}
              </Text>
              <Text style={s.cardSub}>
                Next {conditions.tides.nextTide.type === 'H' ? 'High' : 'Low'}: {' '}
                {new Date(conditions.tides.nextTide.time).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit',
                })} ({conditions.tides.timeToNextTide} min)
              </Text>
            </View>

            {/* Weather Card */}
            <View style={s.card}>
              <Text style={s.cardLabel}>WEATHER</Text>
              <Text style={s.cardValue}>{conditions.weather.temp}°F</Text>
              <Text style={s.cardSub}>
                {conditions.weather.conditions} · Wind {conditions.weather.windSpeed} mph {conditions.weather.windCardinal}
              </Text>
            </View>

            {/* Solunar Card */}
            <View style={[s.card, { borderLeftColor: getSolunarColor(conditions.solunar.rating) }]}>
              <Text style={s.cardLabel}>SOLUNAR</Text>
              <Text style={[s.cardValue, { color: getSolunarColor(conditions.solunar.rating) }]}>
                {conditions.solunar.label}
              </Text>
              <Text style={s.cardSub}>
                Major: {conditions.solunar.majorPeriods.join(' · ')}
              </Text>
            </View>

            {/* Offshore Buoy Card */}
            {conditions.buoy && (
              <View style={s.card}>
                <Text style={s.cardLabel}>OFFSHORE CONDITIONS</Text>
                <Text style={s.cardValue}>{conditions.buoy.waveHeightFt} ft waves</Text>
                <Text style={s.cardSub}>
                  {conditions.buoy.swellPeriodSec}s swell · Water {conditions.buoy.waterTempF}°F
                </Text>
              </View>
            )}
          </>
        )}

        {/* CTA */}
        <TouchableOpacity style={s.cta} onPress={handleGenerateReport} activeOpacity={0.85}>
          <Text style={s.ctaText}>Generate Fishing Report →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getSolunarColor(rating: number): string {
  if (rating >= 80) return COLORS.success;
  if (rating >= 60) return COLORS.seafoam;
  if (rating >= 40) return COLORS.warning;
  return COLORS.textMuted;
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.navy },
  scroll:     { flex: 1 },
  content:    { padding: 20, paddingBottom: 40 },
  header:     { marginBottom: 24 },
  appName:    { fontSize: 28, fontWeight: '700', color: COLORS.white, letterSpacing: 1 },
  tagline:    { fontSize: 15, fontWeight: '600', color: COLORS.seafoam, marginTop: 4, letterSpacing: 0.5 },
  intro:      { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, lineHeight: 22 },
  loader:     { marginTop: 60 },
  errorCard:  { backgroundColor: COLORS.navyLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  errorText:  { color: COLORS.danger, fontSize: 14 },
  card: {
    backgroundColor: COLORS.navyLight,
    borderRadius:    12,
    padding:         16,
    marginBottom:    12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.seafoam,
  },
  cardLabel:  { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  cardValue:  { fontSize: 22, fontWeight: '600', color: COLORS.white },
  cardSub:    { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  cta: {
    backgroundColor: COLORS.seafoam,
    borderRadius:    14,
    paddingVertical: 18,
    alignItems:      'center',
    marginTop:       12,
  },
  ctaText:    { fontSize: 17, fontWeight: '700', color: COLORS.navy },
});
