import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, StyleSheet, RefreshControl, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, DEFAULT_LOCATION, INSHORE_SPECIES, OFFSHORE_SPECIES, APP_SLOGAN, ROUTES } from '@constants/index';
import { useConditionsStore, useReportStore, useWizardStore, useAuthStore, useForecastStore } from '@stores/index';
import type { UserLocation, TideData, SolunarData, WeatherData, BuoyData, DayForecast, WizardDraft } from '@app-types/index';
import { generateForecastBriefing, type ForecastBriefing, type ForecastDay, type LightStatus } from '@services/forecastBriefingService';
import { DaySelector } from '@components/forecast/DaySelector';
import { DaySummaryCard } from '@components/forecast/DaySummaryCard';
import { CategoryCard } from '@components/forecast/CategoryCard';

// ── Location helper ──────────────────────────────
async function getUserLocation(): Promise<UserLocation> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(DEFAULT_LOCATION); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(DEFAULT_LOCATION),
        { timeout: 10000 },
      );
    });
  }
  const Location = require('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return DEFAULT_LOCATION;
  const pos = await Location.getCurrentPositionAsync({});
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

// ── Formatting helpers ───────────────────────────
function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function fmtTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ampm}`;
}
function fmtNow() {
  const d = new Date();
  let h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ampm}`;
}

// ── Solunar color helper ─────────────────────────
function getSolunarColor(rating: number): string {
  if (rating >= 80) return COLORS.success;
  if (rating >= 60) return COLORS.seafoam;
  if (rating >= 40) return COLORS.warning;
  return COLORS.textMuted;
}

// ═══════════════════════════════════════════════════
// SUB-COMPONENTS — inline for single-file clarity
// ═══════════════════════════════════════════════════

// ── Mini bar gauge (horizontal fill) ─────────────
function BarGauge({ value, max, color, label, unit }: {
  value: number; max: number; color: string; label: string; unit: string;
}) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  return (
    <View style={sg.gaugeRow}>
      <Text style={sg.gaugeLabel}>{label}</Text>
      <View style={sg.gaugeTrack}>
        <View style={[sg.gaugeFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={sg.gaugeValue}>{value}{unit}</Text>
    </View>
  );
}

// ── Data readout row (label + mono value) ────────
function DataRow({ label, value, accent }: {
  label: string; value: string; accent?: string;
}) {
  return (
    <View style={sg.dataRow}>
      <Text style={sg.dataLabel}>{label}</Text>
      <Text style={[sg.dataValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

// ── Section header with thin rule ────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={sg.sectionHeader}>
      <View style={sg.sectionRule} />
      <Text style={sg.sectionTitle}>{title}</Text>
      <View style={sg.sectionRule} />
    </View>
  );
}

// ── Tide curve (pure RN — 24 discrete bars) ──────
function TideCurve({ tides }: { tides: TideData }) {
  // Build a simple 24-hour tide representation from predictions
  const predictions = tides.predictions || [];
  const now = new Date();
  const currentHour = now.getHours();

  // Generate synthetic 24-hour tide heights from predictions
  const bars = useMemo(() => {
    if (predictions.length === 0) return Array(24).fill(50);
    // Create sine-ish interpolation between H/L predictions
    const result: number[] = [];
    for (let h = 0; h < 24; h++) {
      // Find nearest predictions around this hour
      let closest = predictions[0];
      let minDist = 999;
      for (const p of predictions) {
        const pH = new Date(p.time).getHours();
        const dist = Math.abs(pH - h);
        if (dist < minDist) { minDist = dist; closest = p; }
      }
      // Normalize height to 0–100 range (assume 0–7ft range)
      const normalized = Math.min(Math.max((closest.height / 7) * 100, 5), 100);
      result.push(normalized);
    }
    return result;
  }, [predictions]);

  return (
    <View style={sg.tideCurveWrap}>
      <View style={sg.tideCurveContainer}>
        {bars.map((h, i) => {
          const isNow = i === currentHour;
          const isPast = i < currentHour;
          return (
            <View key={i} style={sg.tideBarCol}>
              <View style={[
                sg.tideBar,
                { height: `${Math.max(h, 4)}%` as any },
                isNow ? sg.tideBarNow : isPast ? sg.tideBarPast : sg.tideBarFuture,
              ]} />
              {i % 6 === 0 && (
                <Text style={sg.tideHourLabel}>
                  {i === 0 ? '12A' : i === 6 ? '6A' : i === 12 ? '12P' : '6P'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      {/* Current position indicator */}
      <View style={[sg.tideNowLine, { left: `${(currentHour / 24) * 100}%` as any }]}>
        <Text style={sg.tideNowDot}>▼</Text>
      </View>
    </View>
  );
}

// ── Solunar timeline bar ─────────────────────────
function SolunarTimeline({ solunar }: { solunar: SolunarData }) {
  const now = new Date();
  const currentHour = now.getHours();
  const pct = (currentHour / 24) * 100;

  // Parse periods into time ranges for rendering
  const majorTimes = solunar.majorPeriods || [];
  const minorTimes = solunar.minorPeriods || [];

  return (
    <View style={sg.solunarWrap}>
      {/* 24-hour track */}
      <View style={sg.solunarTrack}>
        {/* Major periods */}
        {majorTimes.map((p, i) => {
          const hourMatch = p.match(/(\d{1,2})/);
          const h = hourMatch ? parseInt(hourMatch[1], 10) : 0;
          const isAM = p.toLowerCase().includes('am');
          const hour24 = isAM ? h % 12 : (h % 12) + 12;
          const left = (hour24 / 24) * 100;
          return (
            <View key={`major-${i}`} style={[sg.solunarBlock, sg.solunarMajor, { left: `${left}%` as any }]} />
          );
        })}
        {/* Minor periods */}
        {minorTimes.map((p, i) => {
          const hourMatch = p.match(/(\d{1,2})/);
          const h = hourMatch ? parseInt(hourMatch[1], 10) : 0;
          const isAM = p.toLowerCase().includes('am');
          const hour24 = isAM ? h % 12 : (h % 12) + 12;
          const left = (hour24 / 24) * 100;
          return (
            <View key={`minor-${i}`} style={[sg.solunarBlock, sg.solunarMinor, { left: `${left}%` as any }]} />
          );
        })}
        {/* Now marker */}
        <View style={[sg.solunarNow, { left: `${pct}%` as any }]} />
      </View>
      {/* Legend */}
      <View style={sg.solunarLegend}>
        <View style={sg.legendItem}>
          <View style={[sg.legendDot, { backgroundColor: COLORS.seafoam }]} />
          <Text style={sg.legendText}>MAJOR</Text>
        </View>
        <View style={sg.legendItem}>
          <View style={[sg.legendDot, { backgroundColor: COLORS.ocean }]} />
          <Text style={sg.legendText}>MINOR</Text>
        </View>
      </View>
    </View>
  );
}

// ── Offshore status badge ────────────────────────
function OffshoreStatus({ buoy }: { buoy: BuoyData }) {
  const wh = buoy.waveHeightFt;
  let status = 'GREEN';
  let statusColor: string = COLORS.success;
  if (wh > 4) { status = 'RED'; statusColor = COLORS.danger; }
  else if (wh > 2.5) { status = 'YELLOW'; statusColor = COLORS.warning; }

  return (
    <View style={[sg.offshoreCard, { borderLeftColor: statusColor }]}>
      <View style={sg.offshoreHeader}>
        <Text style={sg.panelLabel}>OFFSHORE</Text>
        <View style={[sg.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={sg.statusText}>{status}</Text>
        </View>
      </View>
      <View style={sg.offshoreGrid}>
        <View style={sg.offshoreCell}>
          <Text style={sg.cellValue}>{buoy.waveHeightFt}</Text>
          <Text style={sg.cellUnit}>ft</Text>
          <Text style={sg.cellLabel}>WAVE</Text>
        </View>
        <View style={sg.offshoreDivider} />
        <View style={sg.offshoreCell}>
          <Text style={sg.cellValue}>{buoy.swellPeriodSec}</Text>
          <Text style={sg.cellUnit}>sec</Text>
          <Text style={sg.cellLabel}>SWELL</Text>
        </View>
        <View style={sg.offshoreDivider} />
        <View style={sg.offshoreCell}>
          <Text style={sg.cellValue}>{buoy.waterTempF}</Text>
          <Text style={sg.cellUnit}>°F</Text>
          <Text style={sg.cellLabel}>SST</Text>
        </View>
        <View style={sg.offshoreDivider} />
        <View style={sg.offshoreCell}>
          <Text style={sg.cellValue}>{buoy.windSpeedKts}</Text>
          <Text style={sg.cellUnit}>kts</Text>
          <Text style={sg.cellLabel}>WIND</Text>
        </View>
      </View>
    </View>
  );
}


// ── 3-Day Success Forecast ───────────────────────
function ForecastStrip({ forecast }: { forecast: DayForecast[] }) {
  return (
    <View>
      <Text style={sg.forecastHeading}>SUCCESS PROBABILITY</Text>
      <View style={sg.forecastContainer}>
      {forecast.map((day, i) => {
        const probColor = day.successProbability >= 80 ? COLORS.success
          : day.successProbability >= 60 ? COLORS.seafoam
          : day.successProbability >= 40 ? COLORS.warning
          : COLORS.textMuted;
        return (
          <View key={day.date} style={[sg.forecastCard, i < forecast.length - 1 && sg.forecastCardBorder]}>
            <Text style={sg.forecastDay}>{day.dayLabel.toUpperCase()}</Text>
            {/* Success probability — big number */}
            <Text style={[sg.forecastProb, { color: probColor }]}>{day.successProbability}%</Text>
            <Text style={[sg.forecastLabel, { color: probColor }]}>{day.successLabel.toUpperCase()}</Text>
            {/* Weather summary */}
            <View style={sg.forecastDivider} />
            <Text style={sg.forecastTemp}>{day.weather.tempHigh}°/{day.weather.tempLow}°</Text>
            <Text style={sg.forecastWind}>{day.weather.windSpeed} mph {day.weather.windCardinal}</Text>
            {day.weather.rainChance > 0 && (
              <Text style={sg.forecastRain}>{day.weather.rainChance}% rain</Text>
            )}
            {/* Solunar + Tides */}
            <View style={sg.forecastDivider} />
            <Text style={sg.forecastSolunar}>SOL {day.solunar.rating}</Text>
            <Text style={sg.forecastTides}>{day.tideEvents.length} tides</Text>
          </View>
        );
      })}
    </View>
    </View>
  );
}

// ── Guide Me Now — smart species picker ─────────
function getRecommendedSpecies(month: number, windSpeed: number): string[] {
  const picks: string[] = [];
  // Inshore picks by season
  if (month >= 3 && month <= 5) {
    picks.push('sheepshead', 'redfish', 'cobia', 'flounder');
  } else if (month >= 6 && month <= 8) {
    picks.push('redfish', 'flounder', 'spanish_mackerel', 'king_mackerel');
  } else if (month >= 9 && month <= 11) {
    picks.push('flounder', 'redfish', 'speckled_trout', 'black_drum');
  } else {
    picks.push('speckled_trout', 'sheepshead', 'redfish', 'black_drum');
  }
  // Calm wind = tarpon opportunity (spring-fall)
  if (windSpeed < 8 && month >= 4 && month <= 10 && !picks.includes('tarpon')) {
    picks.push('tarpon');
  }
  return picks.slice(0, 4);
}

function getCurrentTimeWindow(): 'morning' | 'midday' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// ═══════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════
export default function ConditionsScreen() {
  const { conditions, isLoading, error, fetchConditions, refresh } = useConditionsStore();
  const { generateReport, isGenerating } = useReportStore();
  const { user } = useAuthStore();
  const { forecasts, selectedDay, fetchForecast, setSelectedDay } = useForecastStore();
  const router = useRouter();
  const [guideLoading, setGuideLoading] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [briefing, setBriefing] = useState<ForecastBriefing | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['inshore']));

  const handleForecastPress = () => {
    if (!conditions) return;
    const boatFt = user?.boatLengthFt ?? 24;
    const result = generateForecastBriefing(conditions, boatFt);
    setBriefing(result);
    setShowForecast(true);
  };

  useEffect(() => {
    getUserLocation().then((loc) => {
      fetchConditions(loc);
      fetchForecast(loc);
    });
  }, []);

  const locationLabel = conditions?.location?.label || DEFAULT_LOCATION.label;
  const stationId = conditions?.tides?.station || DEFAULT_LOCATION.noaaStation;

  const handleGuideMe = async () => {
    if (!conditions || guideLoading) return;
    setGuideLoading(true);
    try {
      const month = new Date().getMonth() + 1;
      const wind = conditions.weather?.windSpeed ?? 10;
      const species = getRecommendedSpecies(month, wind);
      const draft: WizardDraft = {
        date:         new Date().toISOString().slice(0, 10),
        timeWindow:   getCurrentTimeWindow(),
        accessType:   'boat',
        boatLengthFt: 24,
        boatSpeedMph: 25,
        species,
        isOffshore:   false,
        baitType:     'live',
        baitIds:      ['live_shrimp', 'finger_mullet'],
      };
      await generateReport(draft, conditions);
      router.push('/report/latest' as any);
    } catch (err) {
      // Report store sets error
    } finally {
      setGuideLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.seafoam} />
        }
      >
        {/* ── Header — Logo + location info ── */}
        <View style={s.headerLogoBlock}>
          <Image
            source={require('../../assets/logo-source.png')}
            style={s.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Info row — time, location, station */}
        <View style={s.headerInfoRow}>
          <Text style={s.headerTime}>{fmtNow()}</Text>
          <Text style={s.headerLoc}>{locationLabel}</Text>
          <Text style={s.headerStation}>STA {stationId}</Text>
        </View>

        {/* Thin scanline accent */}
        <View style={s.scanline} />

        {/* ── Greeting + Question ── */}
        <Text style={s.greeting}>
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </Text>
        <Text style={s.questionText}>What are we doing today?</Text>

        {/* ── Notification Banner ── */}
        <TouchableOpacity
          style={s.notifBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/tabs/notifications' as any)}
        >
          <Text style={s.notifDot}>●</Text>
          <Text style={s.notifText}>You have <Text style={s.notifCount}>0 notifications</Text></Text>
          <Text style={s.notifArrow}>→</Text>
        </TouchableOpacity>

        {/* ── Compact 3-Button Row ── */}
        <View style={s.ctaRow}>
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: COLORS.seafoam }]}
            onPress={() => router.push(ROUTES.WIZARD.STEP_1 as any)}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnIcon}>▶</Text>
            <Text style={[s.ctaBtnLabel, { color: '#060E1A' }]}>REPORT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: '#F59E0B' }]}
            onPress={handleForecastPress}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnIcon}>◉</Text>
            <Text style={[s.ctaBtnLabel, { color: '#060E1A' }]}>FORECAST</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: '#E63946' }]}
            onPress={handleGuideMe}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnIcon}>◎</Text>
            <Text style={[s.ctaBtnLabel, { color: '#FFF' }]}>GUIDE ME</Text>
          </TouchableOpacity>
        </View>

        {/* Forecast modal is triggered by the FORECAST CTA button above */}

        {/* ── Forecast Modal ── */}
        <Modal
          visible={showForecast}
          animationType="slide"
          transparent
          onRequestClose={() => setShowForecast(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              {/* Header */}
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>72-HOUR FORECAST</Text>
                  <Text style={s.modalLoc}>{briefing?.locationLabel ?? ''} • {briefing?.boatLengthFt ?? 24}' boat</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForecast(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={s.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Verdict */}
              {briefing && (
                <View style={s.verdictBar}>
                  <Text style={s.verdictText}>{briefing.overallVerdict}</Text>
                </View>
              )}

              <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
                {briefing?.days.map((day, i) => {
                  const isBest = i === briefing.bestDay;
                  const light = day.assessment.light;
                  const lightColor = light === 'green' ? COLORS.success
                    : light === 'yellow' ? COLORS.warning
                    : COLORS.danger;
                  const lightLabel = light === 'green' ? 'GREEN LIGHT'
                    : light === 'yellow' ? 'YELLOW LIGHT'
                    : 'RED LIGHT';
                  const lightIcon = light === 'green' ? '🟢'
                    : light === 'yellow' ? '🟡'
                    : '🔴';

                  return (
                    <View key={day.date} style={[s.fDay, isBest && s.fDayBest, { borderLeftWidth: 4, borderLeftColor: lightColor }]}>
                      {/* Day header row */}
                      <View style={s.fDayHeader}>
                        <View style={s.fDayLabelWrap}>
                          <Text style={s.fDayLabel}>{day.dayLabel.toUpperCase()}</Text>
                          {isBest && <Text style={s.fBestBadge}>★ BEST DAY</Text>}
                        </View>
                        <View style={[s.fStatusBadge, { backgroundColor: lightColor }]}>
                          <Text style={s.fStatusText}>{lightIcon} {lightLabel}</Text>
                        </View>
                      </View>

                      {/* Success + conditions row */}
                      <View style={s.fStatsRow}>
                        <View style={s.fStatBlock}>
                          <Text style={[s.fStatBig, { color: lightColor }]}>{day.successPct}%</Text>
                          <Text style={s.fStatSub}>SUCCESS</Text>
                        </View>
                        <View style={s.fStatBlock}>
                          <Text style={s.fStatBig}>{day.tempHigh}°</Text>
                          <Text style={s.fStatSub}>{day.tempLow}° LOW</Text>
                        </View>
                        <View style={s.fStatBlock}>
                          <Text style={s.fStatBig}>{day.wind}</Text>
                          <Text style={s.fStatSub}>MPH {day.windDir}</Text>
                        </View>
                        <View style={s.fStatBlock}>
                          <Text style={s.fStatBig}>{day.solunarRating}</Text>
                          <Text style={s.fStatSub}>SOLUNAR</Text>
                        </View>
                      </View>

                      {/* Weather conditions */}
                      <Text style={s.fConditions}>{day.conditions}</Text>

                      {/* Tides */}
                      <Text style={s.fTides}>{day.tideSummary}</Text>

                      {/* Best window */}
                      <Text style={s.fWindow}>Best bite: {day.bestWindow}</Text>

                      {/* Targets */}
                      <View style={s.fTargetRow}>
                        <Text style={s.fTargetLabel}>TARGET:</Text>
                        {day.topTargets.map((t) => (
                          <View key={t} style={s.fTargetPill}>
                            <Text style={s.fTargetPillText}>{t}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Assessment reasons */}
                      {day.assessment.reasons.map((r, ri) => (
                        <Text key={ri} style={[s.fReason, { color: r.startsWith('✓') || r.includes('calm') || r.includes('glass') || r.includes('comfortable') || r.includes('Light wind') || r.includes('peak feeding') ? COLORS.success : light === 'red' ? COLORS.danger : COLORS.textSecondary }]}>
                          {light === 'green' ? '✓' : light === 'yellow' ? '⚠' : '✕'} {r}
                        </Text>
                      ))}
                    </View>
                  );
                })}
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── GUIDE ME loading indicator ── */}
        {guideLoading && (
          <View style={s.guideMeLoading}>
            <ActivityIndicator size="small" color={COLORS.seafoam} />
            <Text style={s.guideMeLoadingText}>GENERATING YOUR GUIDE...</Text>
          </View>
        )}

        {/* ── Loading ────────────────────────────── */}
        {isLoading && !conditions && (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.seafoam} />
            <Text style={s.loadingText}>ACQUIRING DATA...</Text>
          </View>
        )}

        {/* ── Error ──────────────────────────────── */}
        {error && (
          <View style={s.errorCard}>
            <Text style={s.errorLabel}>SYS ERROR</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Conditions Panels ──────────────────── */}
        {conditions && (
          <>
            {/* ── PRIMARY DATA GRID ─────────────── */}
            <View style={s.primaryGrid}>
              {/* Air Temp */}
              <View style={s.primaryCell}>
                <Text style={s.primaryValue}>{conditions.weather.temp}°</Text>
                <Text style={s.primaryUnit}>AIR °F</Text>
              </View>
              {/* Wind */}
              <View style={s.primaryCell}>
                <Text style={s.primaryValue}>{conditions.weather.windSpeed}</Text>
                <Text style={s.primaryUnit}>WIND MPH {conditions.weather.windCardinal}</Text>
              </View>
              {/* Humidity */}
              <View style={s.primaryCell}>
                <Text style={s.primaryValue}>{conditions.weather.humidity}%</Text>
                <Text style={s.primaryUnit}>HUMIDITY</Text>
              </View>
              {/* Visibility */}
              <View style={s.primaryCell}>
                <Text style={s.primaryValue}>{conditions.weather.visibility}</Text>
                <Text style={s.primaryUnit}>VIS mi</Text>
              </View>
            </View>

            <Text style={s.conditionsLabel}>{conditions.weather.conditions.toUpperCase()}</Text>

            {/* ── 3-DAY FORECAST with inshore/offshore split ── */}
            {forecasts.length > 0 && (
              <>
                <SectionHeader title="3-DAY FORECAST" />
                <DaySelector
                  forecasts={forecasts.slice(0, 3)}
                  selectedDay={Math.min(selectedDay, 2)}
                  onSelect={setSelectedDay}
                />

                {/* Inshore / Offshore success % */}
                {(() => {
                  const day = forecasts[Math.min(selectedDay, 2)];
                  if (!day) return null;
                  const inshore = day.categories.find(c => c.categoryId === 'inshore');
                  const offshore = day.categories.find(c => c.categoryId === 'offshore_trolling' || c.categoryId === 'offshore_reef');
                  const inshoreScore = inshore?.topScore ?? 0;
                  const offshoreScore = offshore?.topScore ?? 0;
                  return (
                    <View style={s.successRow}>
                      <View style={s.successCard}>
                        <Text style={s.successLabel}>INSHORE</Text>
                        <Text style={[s.successPct, { color: inshoreScore >= 50 ? COLORS.success : COLORS.warning }]}>
                          {inshoreScore}%
                        </Text>
                        <Text style={s.successSub}>success</Text>
                      </View>
                      <View style={s.successCard}>
                        <Text style={s.successLabel}>OFFSHORE</Text>
                        <Text style={[s.successPct, { color: offshoreScore >= 50 ? COLORS.success : COLORS.warning }]}>
                          {offshoreScore}%
                        </Text>
                        <Text style={s.successSub}>success</Text>
                      </View>
                    </View>
                  );
                })()}

                <DaySummaryCard day={forecasts[Math.min(selectedDay, 2)]} />
                {forecasts[Math.min(selectedDay, 2)].categories.map(cat => (
                  <CategoryCard
                    key={cat.categoryId}
                    category={cat}
                    expanded={expandedCategories.has(cat.categoryId)}
                    onToggle={() => {
                      setExpandedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(cat.categoryId)) next.delete(cat.categoryId);
                        else next.add(cat.categoryId);
                        return next;
                      });
                    }}
                  />
                ))}
              </>
            )}

            {/* ── TIDE SECTION ──────────────────── */}
            <SectionHeader title="TIDES" />
            <View style={s.panel}>
              <View style={s.tideHeadRow}>
                <View>
                  <Text style={s.tideMainValue}>{conditions.tides.currentHeight} ft</Text>
                  <Text style={s.tideTrend}>
                    {conditions.tides.currentTrend === 'rising' ? '▲' : conditions.tides.currentTrend === 'falling' ? '▼' : '◆'}{' '}
                    {conditions.tides.currentTrend.toUpperCase()}
                  </Text>
                </View>
                <View style={s.tideNext}>
                  <Text style={s.tideNextLabel}>NEXT {conditions.tides.nextTide.type === 'H' ? 'HIGH' : 'LOW'}</Text>
                  <Text style={s.tideNextTime}>{fmtTime(conditions.tides.nextTide.time)}</Text>
                  <Text style={s.tideNextEta}>{conditions.tides.timeToNextTide} MIN</Text>
                </View>
              </View>
              <TideCurve tides={conditions.tides} />
            </View>

            {/* ── SOLUNAR SECTION ──────────────── */}
            <SectionHeader title="SOLUNAR" />
            <View style={s.panel}>
              <View style={s.solunarHeadRow}>
                <View style={[s.solunarRatingBadge, { borderColor: getSolunarColor(conditions.solunar.rating) }]}>
                  <Text style={[s.solunarRatingNum, { color: getSolunarColor(conditions.solunar.rating) }]}>
                    {conditions.solunar.rating}
                  </Text>
                </View>
                <View style={s.solunarMeta}>
                  <Text style={[s.solunarGrade, { color: getSolunarColor(conditions.solunar.rating) }]}>
                    {conditions.solunar.label.toUpperCase()}
                  </Text>
                  <Text style={s.solunarPeriodText}>
                    MAJOR: {conditions.solunar.majorPeriods.join(' · ')}
                  </Text>
                  {conditions.solunar.minorPeriods.length > 0 && (
                    <Text style={s.solunarPeriodText}>
                      MINOR: {conditions.solunar.minorPeriods.join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
              <SolunarTimeline solunar={conditions.solunar} />
            </View>

            {/* ── GAUGES ───────────────────────── */}
            <SectionHeader title="CONDITIONS" />
            <View style={s.panel}>
              <BarGauge label="WIND" value={conditions.weather.windSpeed} max={35} color={COLORS.seafoam} unit=" mph" />
              <BarGauge label="HUMIDITY" value={conditions.weather.humidity} max={100} color={COLORS.ocean} unit="%" />
              <BarGauge label="VISIBILITY" value={conditions.weather.visibility} max={10} color={COLORS.sky} unit=" mi" />
              {conditions.buoy && (
                <BarGauge label="WAVE HT" value={conditions.buoy.waveHeightFt} max={10} color={COLORS.warning} unit=" ft" />
              )}
            </View>

            {/* ── OFFSHORE (conditional) ─────── */}
            {conditions.buoy && (
              <>
                <SectionHeader title="OFFSHORE" />
                <OffshoreStatus buoy={conditions.buoy} />
              </>
            )}
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


// ═══════════════════════════════════════════════════
// STYLES — scientific / ops console aesthetic
// ═══════════════════════════════════════════════════
const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#060E1A' },
  scroll:     { flex: 1 },
  content:    { padding: 12, paddingBottom: 24 },

  // ── Header ──────────────────────────
  headerLogoBlock: {
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLogo: {
    width: 120,
    height: 120,
  },
  headerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  headerTime: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: MONO,
    fontWeight: '600',
  },
  headerLoc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: MONO,
    marginTop: 1,
  },
  headerStation: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 1,
  },

  scanline: {
    height: 1,
    backgroundColor: COLORS.seafoam,
    opacity: 0.3,
    marginVertical: 6,
  },

  // ── Greeting + CTA Row ────────────
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 14,
    marginBottom: 2,
  },
  questionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2B4A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  notifDot: {
    fontSize: 10,
    color: '#E63946',
    marginRight: 8,
  },
  notifText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: MONO,
  },
  notifCount: {
    color: COLORS.white,
    fontWeight: '700',
  },
  notifArrow: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  ctaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  ctaBtnIcon: {
    fontSize: 18,
    color: '#060E1A',
    marginBottom: 4,
  },
  ctaBtnLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },

  // ── Inshore / Offshore success row ──
  successRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  successCard: {
    flex: 1,
    backgroundColor: '#0D2B4A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  successLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  successPct: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: MONO,
    fontVariant: ['tabular-nums'] as any,
  },
  successSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // ── Loading / Error ──────────────────
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  errorCard: {
    backgroundColor: PANEL_BG,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.danger,
    padding: 12,
    marginBottom: 12,
  },
  errorLabel: {
    fontSize: 10,
    color: COLORS.danger,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: MONO,
  },

  // ── Primary grid (top 4 values) ─────
  primaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  primaryCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  primaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  primaryUnit: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  conditionsLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },

  // ── Guide Me Loading ──────────────────
  guideMeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#081E36',
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    marginBottom: 12,
    gap: 10,
  },
  guideMeLoadingText: {
    fontSize: 11,
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 2,
  },

  // ── Quick Fishing Forecast Button ───
  forecastBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warning,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  forecastBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 3,
    textAlign: 'center',
  },
  forecastBtnSub: {
    fontSize: 9,
    color: '#060E1A',
    opacity: 0.6,
    fontFamily: MONO,
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── Forecast Modal ──────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#060E1A',
    borderTopWidth: 2,
    borderTopColor: COLORS.warning,
    maxHeight: '92%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.warning,
    fontFamily: MONO,
    letterSpacing: 3,
  },
  modalLoc: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 3,
  },
  modalClose: {
    fontSize: 22,
    color: COLORS.textMuted,
    paddingLeft: 12,
  },
  verdictBar: {
    backgroundColor: `${COLORS.warning}15`,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${COLORS.warning}33`,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  verdictText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalScroll: {
    paddingHorizontal: 16,
  },

  // ── Forecast Day Card ───────────────
  fDay: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 10,
  },
  fDayBest: {
    borderColor: COLORS.success,
    borderWidth: 1.5,
  },
  fDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fDayLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fDayLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  fBestBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.success,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  fStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 2,
  },
  fStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: GRID_LINE,
  },
  fStatBlock: {
    alignItems: 'center',
    flex: 1,
  },
  fStatBig: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
  },
  fStatSub: {
    fontSize: 7,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1,
    marginTop: 2,
  },
  fConditions: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: MONO,
    marginBottom: 4,
  },
  fTides: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginBottom: 4,
  },
  fWindow: {
    fontSize: 11,
    color: COLORS.seafoam,
    fontFamily: MONO,
    fontWeight: '600',
    marginBottom: 8,
  },
  fTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  fTargetLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  fTargetPill: {
    backgroundColor: `${COLORS.seafoam}18`,
    borderWidth: 1,
    borderColor: `${COLORS.seafoam}44`,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fTargetPillText: {
    fontSize: 10,
    color: COLORS.seafoam,
    fontFamily: MONO,
    fontWeight: '600',
  },
  fReason: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 2,
  },
  fRain: {
    fontSize: 10,
    color: COLORS.info,
    fontFamily: MONO,
    marginTop: 4,
  },

  // ── Panel (reusable container) ───────
  panel: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 10,
    marginBottom: 8,
  },

  // ── Tide ─────────────────────────────
  tideHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tideMainValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  tideTrend: {
    fontSize: 12,
    color: COLORS.seafoam,
    fontFamily: MONO,
    marginTop: 2,
  },
  tideNext: { alignItems: 'flex-end' },
  tideNextLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  tideNextTime: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: MONO,
    marginTop: 2,
  },
  tideNextEta: {
    fontSize: 11,
    color: COLORS.seafoam,
    fontFamily: MONO,
    marginTop: 1,
  },

  // ── Solunar ──────────────────────────
  solunarHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  solunarRatingBadge: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solunarRatingNum: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: MONO,
  },
  solunarMeta: { flex: 1 },
  solunarGrade: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 2,
  },
  solunarPeriodText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },

});

// ── Sub-component styles ──────────────────────────
const sg = StyleSheet.create({
  // Data row
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GRID_LINE,
  },
  dataLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  dataValue: {
    fontSize: 13,
    color: COLORS.white,
    fontFamily: MONO,
    fontWeight: '600',
  },

  // Bar gauge
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gaugeLabel: {
    width: 72,
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  gaugeTrack: {
    flex: 1,
    height: 6,
    backgroundColor: GRID_LINE,
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 0,
  },
  gaugeValue: {
    width: 56,
    fontSize: 12,
    color: COLORS.white,
    fontFamily: MONO,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: GRID_LINE,
  },
  sectionTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 3,
    paddingHorizontal: 12,
  },

  // Tide curve
  tideCurveWrap: {
    height: 70,
    position: 'relative',
    marginTop: 4,
  },
  tideCurveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    gap: 2,
  },
  tideBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 56,
  },
  tideBar: {
    width: '80%',
    minHeight: 2,
    borderRadius: 0,
  },
  tideBarPast: { backgroundColor: '#0D3A5C' },
  tideBarFuture: { backgroundColor: COLORS.ocean },
  tideBarNow: { backgroundColor: COLORS.seafoam },
  tideHourLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 3,
  },
  tideNowLine: {
    position: 'absolute',
    top: -2,
    width: 0,
    alignItems: 'center',
  },
  tideNowDot: {
    fontSize: 8,
    color: COLORS.seafoam,
  },

  // Solunar timeline
  solunarWrap: { marginTop: 4 },
  solunarTrack: {
    height: 12,
    backgroundColor: GRID_LINE,
    borderRadius: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  solunarBlock: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '8%',
    borderRadius: 0,
  },
  solunarMajor: { backgroundColor: COLORS.seafoam, opacity: 0.7 },
  solunarMinor: { backgroundColor: COLORS.ocean, opacity: 0.5 },
  solunarNow: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 16,
    backgroundColor: COLORS.white,
  },
  solunarLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 0 },
  legendText: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1,
  },

  // Forecast strip
  forecastHeading: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  forecastContainer: {
    flexDirection: 'row',
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    marginBottom: 12,
  },
  forecastCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  forecastCardBorder: {
    borderRightWidth: 1,
    borderRightColor: GRID_LINE,
  },
  forecastDay: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 6,
  },
  forecastProb: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: MONO,
  },
  forecastLabel: {
    fontSize: 8,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginTop: -2,
  },
  forecastDivider: {
    width: '60%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: GRID_LINE,
    marginVertical: 6,
  },
  forecastTemp: {
    fontSize: 11,
    color: COLORS.white,
    fontFamily: MONO,
    fontWeight: '600',
  },
  forecastWind: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },
  forecastRain: {
    fontSize: 9,
    color: COLORS.info,
    fontFamily: MONO,
    marginTop: 1,
  },
  forecastSolunar: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontFamily: MONO,
  },
  forecastTides: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 1,
  },

  // Offshore
  offshoreCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 12,
  },
  offshoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  offshoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  offshoreCell: { alignItems: 'center' },
  cellValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  cellUnit: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: -2,
  },
  cellLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginTop: 4,
  },
  offshoreDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: GRID_LINE,
  },
});
