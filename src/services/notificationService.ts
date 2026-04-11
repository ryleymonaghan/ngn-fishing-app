// ─────────────────────────────────────────────
// NGN Fishing — Push Notification Service
// On-the-water move-timing alerts
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import type { FishingReport, ScheduleEntry } from '@app-types/index';

// Conditional import — expo-notifications doesn't work on web
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch {}
}

// ── Types ────────────────────────────────────
export interface MoveAlert {
  id: string;
  scheduledFor: Date;
  title: string;
  body: string;
  spot: string;
  species: string;
}

// ── Permission ──────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Configure notification channel (Android) ─
export async function configureNotifications(): Promise<void> {
  if (!Notifications) return;

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('move-alerts', {
      name: 'Move Alerts',
      importance: Notifications.AndroidImportance?.MAX ?? 5,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4ECDC4',
      sound: 'default',
      description: 'Real-time alerts for when to move to your next fishing spot',
    });
  }

  // Set notification handler — show alert even when app is open
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ── Schedule Move Alerts from Report ────────
// Takes a fishing report's schedule and user's boat speed,
// then schedules local push notifications for each move time.
export async function scheduleMoveAlerts(
  report: FishingReport,
  boatSpeedMph: number = 25,
): Promise<MoveAlert[]> {
  if (!Notifications) return [];

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  // Cancel any existing alerts first
  await cancelAllMoveAlerts();

  const alerts: MoveAlert[] = [];
  const today = new Date();
  const reportDate = report.input?.date ?? today.toISOString().slice(0, 10);

  for (let i = 0; i < report.schedule.length; i++) {
    const entry = report.schedule[i];
    const scheduleTime = parseScheduleTime(entry.time, reportDate);
    if (!scheduleTime || scheduleTime <= new Date()) continue;

    // Schedule a "heads up" notification 15 minutes before
    const headsUpTime = new Date(scheduleTime.getTime() - 15 * 60 * 1000);
    if (headsUpTime > new Date()) {
      const alertId = `move-${i}-headsup`;
      const title = `🎣 ${entry.species} — Move in 15 min`;
      const body = `Head to ${entry.location}. ${entry.tide}. Rig: ${entry.rig}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type: 'move_alert', scheduleIndex: i, spotName: entry.location },
          ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
        },
        trigger: {
          type: 'date',
          date: headsUpTime,
        },
      });

      alerts.push({
        id: alertId,
        scheduledFor: headsUpTime,
        title,
        body,
        spot: entry.location,
        species: entry.species,
      });
    }

    // Schedule the "move now" notification at the entry time
    const moveNowId = `move-${i}-now`;
    const moveTitle = `⚡ ${entry.species} bite window OPEN`;
    const moveBody = `Get to ${entry.location} now! ${entry.tide}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: moveTitle,
        body: moveBody,
        sound: 'default',
        data: { type: 'move_now', scheduleIndex: i, spotName: entry.location },
        ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
      },
      trigger: {
        type: 'date',
        date: scheduleTime,
      },
    });

    alerts.push({
      id: moveNowId,
      scheduledFor: scheduleTime,
      title: moveTitle,
      body: moveBody,
      spot: entry.location,
      species: entry.species,
    });
  }

  // Schedule tide change alerts from conditions
  const tides = report.conditions?.tides;
  if (tides?.nextTide) {
    const nextTideTime = new Date(tides.nextTide.time);
    const tideAlertTime = new Date(nextTideTime.getTime() - 20 * 60 * 1000);
    if (tideAlertTime > new Date()) {
      const tideType = tides.nextTide.type === 'H' ? 'High' : 'Low';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🌊 ${tideType} tide in 20 min`,
          body: `${tideType} tide at ${tides.nextTide.height}ft. Reposition for the change.`,
          sound: 'default',
          data: { type: 'tide_alert' },
          ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
        },
        trigger: {
          type: 'date',
          date: tideAlertTime,
        },
      });

      alerts.push({
        id: 'tide-change',
        scheduledFor: tideAlertTime,
        title: `${tideType} tide in 20 min`,
        body: `Reposition for the tide change`,
        spot: '',
        species: '',
      });
    }
  }

  return alerts;
}

// ── Cancel All Scheduled Alerts ─────────────
export async function cancelAllMoveAlerts(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// ── Get Pending Alerts ──────────────────────
export async function getPendingAlerts(): Promise<number> {
  if (!Notifications) return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}

// ── Weather Alert Thresholds ────────────────
const WEATHER_THRESHOLDS = {
  HIGH_WIND_MPH: 20,        // Alert when sustained winds exceed this
  GUST_WARNING_MPH: 30,     // Strong gust warning
  LIGHTNING_KEYWORDS: ['thunderstorm', 'lightning', 'severe'],
  HEAVY_RAIN_KEYWORDS: ['heavy rain', 'downpour'],
  SMALL_CRAFT_WIND_MPH: 25, // Small craft advisory threshold
} as const;

export interface WeatherAlert {
  type: 'wind' | 'lightning' | 'small_craft' | 'rain' | 'temperature_drop';
  severity: 'warning' | 'watch' | 'advisory';
  title: string;
  body: string;
  scheduledFor?: Date;
}

// ── Schedule Weather Alerts ─────────────────
// Checks current + forecast conditions and schedules
// alerts for dangerous weather changes.
export async function scheduleWeatherAlerts(
  currentWeather: {
    windSpeed: number;
    windCardinal: string;
    conditions: string;
    temp: number;
  },
  forecastData?: Array<{
    dt: number;
    windSpeed: number;
    conditions: string;
    temp: number;
    pop?: number; // probability of precipitation 0-1
  }>,
): Promise<WeatherAlert[]> {
  if (!Notifications) return [];

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  const alerts: WeatherAlert[] = [];

  // ── Current high wind alert ──
  if (currentWeather.windSpeed >= WEATHER_THRESHOLDS.HIGH_WIND_MPH) {
    const severity = currentWeather.windSpeed >= WEATHER_THRESHOLDS.SMALL_CRAFT_WIND_MPH
      ? 'warning' : 'advisory';
    const alert: WeatherAlert = {
      type: currentWeather.windSpeed >= WEATHER_THRESHOLDS.SMALL_CRAFT_WIND_MPH ? 'small_craft' : 'wind',
      severity,
      title: currentWeather.windSpeed >= WEATHER_THRESHOLDS.SMALL_CRAFT_WIND_MPH
        ? '⚠️ Small Craft Advisory'
        : '💨 High Wind Advisory',
      body: `Winds ${currentWeather.windSpeed} mph ${currentWeather.windCardinal}. ${
        severity === 'warning' ? 'Consider staying inshore or postponing.' : 'Use caution on open water.'
      }`,
    };
    alerts.push(alert);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.body,
        sound: 'default',
        data: { type: 'weather_alert', alertType: alert.type },
        ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
      },
      trigger: null, // immediate
    });
  }

  // ── Current lightning/storm check ──
  const conditionsLower = currentWeather.conditions.toLowerCase();
  if (WEATHER_THRESHOLDS.LIGHTNING_KEYWORDS.some(k => conditionsLower.includes(k))) {
    const alert: WeatherAlert = {
      type: 'lightning',
      severity: 'warning',
      title: '⛈ Thunderstorm Warning',
      body: 'Thunderstorms in the area. Get off the water immediately. Seek shelter.',
    };
    alerts.push(alert);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.body,
        sound: 'default',
        data: { type: 'weather_alert', alertType: 'lightning' },
        ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
      },
      trigger: null,
    });
  }

  // ── Forecast-based alerts (upcoming weather changes) ──
  if (forecastData) {
    for (const fc of forecastData) {
      const fcTime = new Date(fc.dt * 1000);
      if (fcTime <= new Date()) continue;

      // Upcoming storm
      const fcConditions = fc.conditions.toLowerCase();
      if (WEATHER_THRESHOLDS.LIGHTNING_KEYWORDS.some(k => fcConditions.includes(k))) {
        const minutesAway = Math.round((fcTime.getTime() - Date.now()) / 60000);
        if (minutesAway > 15 && minutesAway < 360) {
          const alertTime = new Date(fcTime.getTime() - 30 * 60 * 1000); // 30 min before
          if (alertTime > new Date()) {
            const alert: WeatherAlert = {
              type: 'lightning',
              severity: 'watch',
              title: '⛈ Storm Approaching',
              body: `Thunderstorms expected in ~${minutesAway} minutes. Plan your exit now.`,
              scheduledFor: alertTime,
            };
            alerts.push(alert);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: alert.title,
                body: alert.body,
                sound: 'default',
                data: { type: 'weather_alert', alertType: 'lightning_forecast' },
                ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
              },
              trigger: { type: 'date', date: alertTime },
            });
            break; // only one storm forecast alert
          }
        }
      }

      // Upcoming high wind
      if (fc.windSpeed >= WEATHER_THRESHOLDS.HIGH_WIND_MPH && currentWeather.windSpeed < WEATHER_THRESHOLDS.HIGH_WIND_MPH) {
        const minutesAway = Math.round((fcTime.getTime() - Date.now()) / 60000);
        if (minutesAway > 15 && minutesAway < 360) {
          const alertTime = new Date(fcTime.getTime() - 20 * 60 * 1000);
          if (alertTime > new Date()) {
            const alert: WeatherAlert = {
              type: 'wind',
              severity: 'watch',
              title: '💨 Wind Increasing',
              body: `Winds expected to reach ${fc.windSpeed} mph in ~${minutesAway} min. Consider heading in.`,
              scheduledFor: alertTime,
            };
            alerts.push(alert);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: alert.title,
                body: alert.body,
                sound: 'default',
                data: { type: 'weather_alert', alertType: 'wind_forecast' },
                ...(Platform.OS === 'android' ? { channelId: 'move-alerts' } : {}),
              },
              trigger: { type: 'date', date: alertTime },
            });
            break; // only one wind forecast alert
          }
        }
      }
    }
  }

  return alerts;
}

// ── Helper: parse schedule time string ──────
// Converts "10:30 AM" + "2026-04-05" → Date
function parseScheduleTime(timeStr: string, dateStr: string): Date | null {
  try {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  } catch {
    return null;
  }
}
