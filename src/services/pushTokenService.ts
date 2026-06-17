// ─────────────────────────────────────────────
// NGN Fishing — Push Token Registration
// Registers Expo push tokens with Supabase so the
// backend can send server-side push notifications
// (weather change alerts, etc.)
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import { supabase } from '@lib/supabase';

let Notifications: any = null;
let Constants: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Constants = require('expo-constants');
  } catch {}
}

// ── Register push token for current user ────
// Call this after successful sign-in / sign-up.
// Upserts so duplicate tokens don't pile up.
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Notifications || Platform.OS === 'web') return null;

  try {
    // Request permission first
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId
      ?? Constants?.default?.expoConfig?.extra?.eas?.projectId
      ?? 'bcba23bd-07f5-4aa3-bd89-53398db49ba1'; // fallback EAS project ID

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (!token) {
      console.warn('[Push] No token returned');
      return null;
    }

    console.log('[Push] Token obtained:', token.substring(0, 20) + '...');

    // Upsert into Supabase — unique on (user_id, expo_push_token)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform: Platform.OS,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' }
      );

    if (error) {
      console.error('[Push] Token upsert failed:', error.message);
      return null;
    }

    console.log('[Push] Token registered successfully');
    return token;
  } catch (err: any) {
    console.error('[Push] Registration error:', err.message);
    return null;
  }
}

// ── Disable push token (user toggles off) ───
export async function disablePushToken(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) console.error('[Push] Disable failed:', error.message);
  } catch (err: any) {
    console.error('[Push] Disable error:', err.message);
  }
}

// ── Re-enable push token (user toggles back on) ─
export async function enablePushToken(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .update({ enabled: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) console.error('[Push] Enable failed:', error.message);
  } catch (err: any) {
    console.error('[Push] Enable error:', err.message);
  }
}

// ── Update notification preference in profiles ─
export async function updateWeatherAlertsPref(
  userId: string,
  enabled: boolean,
  homeLat?: number,
  homeLng?: number,
): Promise<void> {
  try {
    const update: Record<string, any> = { weather_alerts_enabled: enabled };
    if (homeLat !== undefined && homeLng !== undefined) {
      update.home_lat = homeLat;
      update.home_lng = homeLng;
    }

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId);

    if (error) console.error('[Push] Prefs update failed:', error.message);
  } catch (err: any) {
    console.error('[Push] Prefs error:', err.message);
  }
}

// ── Remove token on sign-out ────────────────
export async function removePushToken(userId: string): Promise<void> {
  if (!Notifications || Platform.OS === 'web') return;

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId
      ?? Constants?.default?.expoConfig?.extra?.eas?.projectId
      ?? 'bcba23bd-07f5-4aa3-bd89-53398db49ba1';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;

    if (token) {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('expo_push_token', token);
    }
  } catch (err: any) {
    console.error('[Push] Remove error:', err.message);
  }
}
