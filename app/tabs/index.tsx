import { useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, ROUTES, DEFAULT_LOCATION } from '@constants/index';
import { useConditionsStore } from '@stores/index';
import type { UserLocation, TideData, SolunarData, WeatherData, BuoyData } from '@app-types/index';

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


// ═══════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════
export default function ConditionsScreen() {
  const router = useRouter();
  const { conditions, isLoading, error, fetchConditions, refresh } = useConditionsStore();

  useEffect(() => {
    getUserLocation().then(fetchConditions);
  }, []);

  const handleGenerateReport = () => {
    router.push(ROUTES.WIZARD.STEP_1 as any);
  };

  const locationLabel = conditions?.location?.label || DEFAULT_LOCATION.label;
  const stationId = conditions?.tides?.station || DEFAULT_LOCATION.noaaStation;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.seafoam} />
        }
      >
        {/* ── Header Bar ─────────────────────────── */}
        <View style={s.headerBar}>
          <View>
            <Text style={s.brandMark}>NGN</Text>
            <Text style={s.brandSub}>FISHING</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTime}>{fmtNow()}</Text>
            <Text style={s.headerLoc}>{locationLabel}</Text>
            <Text style={s.headerStation}>STA {stationId}</Text>
          </View>
        </View>

        {/* Thin scanline accent */}
        <View style={s.scanline} />

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

        {/* ── CTA ────────────────────────────────── */}
        <TouchableOpacity style={s.cta} onPress={handleGenerateReport} activeOpacity={0.8}>
          <View style={s.ctaInner}>
            <Text style={s.ctaLabel}>GENERATE REPORT</Text>
            <Text style={s.ctaArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
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
  content:    { padding: 16, paddingBottom: 40 },

  // ── Header ──────────────────────────
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  brandMark: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.seafoam,
    letterSpacing: 6,
    fontFamily: MONO,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 4,
    marginTop: -4,
    fontFamily: MONO,
  },
  headerRight: { alignItems: 'flex-end' },
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
    marginVertical: 10,
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
    paddingVertical: 12,
  },
  primaryValue: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  primaryUnit: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  conditionsLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },

  // ── Panel (reusable container) ───────
  panel: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 12,
  },

  // ── Tide ─────────────────────────────
  tideHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tideMainValue: {
    fontSize: 28,
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
    marginBottom: 12,
    gap: 14,
  },
  solunarRatingBadge: {
    width: 52,
    height: 52,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solunarRatingNum: {
    fontSize: 24,
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

  // ── CTA ──────────────────────────────
  cta: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.seafoam,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  ctaInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 3,
  },
  ctaArrow: {
    fontSize: 20,
    color: COLORS.seafoam,
    fontFamily: MONO,
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
