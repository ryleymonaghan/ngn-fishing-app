// ─────────────────────────────────────────────
// NGN Fishing — Community Service (Pro Angler)
// Radius-based chat + live pin drops via Supabase Realtime
// ─────────────────────────────────────────────

import { supabase } from '@lib/supabase';
import type { ChatMessage, LivePin, PinType } from '@app-types/index';
import type { RealtimeChannel } from '@supabase/supabase-js';

// 15 miles in meters
const RADIUS_METERS = 24_140;

// ── Chat ─────────────────────────────────────

/** Fetch chat messages within 15-mile radius, last 24 hours */
export async function fetchNearbyChat(
  lat: number,
  lng: number
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('nearby_chat', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: RADIUS_METERS,
    p_max_age_hours: 24,
  });
  if (error) {
    console.warn('[community] fetchNearbyChat error:', error.message);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

/** Send a chat message pinned to current location */
export async function sendChatMessage(
  userId: string,
  displayName: string,
  message: string,
  lat: number,
  lng: number
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('angler_chat')
    .insert({
      user_id: userId,
      display_name: displayName,
      message,
      lat,
      lng,
    })
    .select()
    .single();

  if (error) {
    console.error('[community] sendChatMessage error:', error.message);
    throw new Error(error.message);
  }
  return data as ChatMessage;
}

// ── Live Pins ────────────────────────────────

/** Fetch active (non-expired) pins within 15-mile radius */
export async function fetchNearbyPins(
  lat: number,
  lng: number
): Promise<LivePin[]> {
  const { data, error } = await supabase.rpc('nearby_pins', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: RADIUS_METERS,
  });
  if (error) {
    console.warn('[community] fetchNearbyPins error:', error.message);
    return [];
  }
  return (data ?? []) as LivePin[];
}

/** Drop a new pin (bait or fishing location) */
export async function dropPin(
  userId: string,
  displayName: string,
  lat: number,
  lng: number,
  pinType: PinType,
  description?: string,
  speciesTag?: string
): Promise<LivePin | null> {
  const { data, error } = await supabase
    .from('live_pins')
    .insert({
      user_id: userId,
      display_name: displayName,
      lat,
      lng,
      pin_type: pinType,
      description: description ?? null,
      species_tag: speciesTag ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[community] dropPin error:', error.message);
    throw new Error(error.message);
  }
  return data as LivePin;
}

/** Remove your own pin */
export async function removePin(pinId: string): Promise<void> {
  const { error } = await supabase
    .from('live_pins')
    .delete()
    .eq('id', pinId);

  if (error) {
    console.error('[community] removePin error:', error.message);
    throw new Error(error.message);
  }
}

// ── Realtime Subscriptions ───────────────────

let chatChannel: RealtimeChannel | null = null;
let pinsChannel: RealtimeChannel | null = null;

/**
 * Subscribe to new chat messages in real time.
 * onNewMessage fires for every INSERT on angler_chat.
 * Client-side radius filtering happens in the store.
 */
export function subscribeToChatRealtime(
  onNewMessage: (msg: ChatMessage) => void
): RealtimeChannel {
  // Clean up existing subscription
  if (chatChannel) {
    supabase.removeChannel(chatChannel);
  }

  chatChannel = supabase
    .channel('angler_chat_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'angler_chat' },
      (payload) => {
        onNewMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return chatChannel;
}

/**
 * Subscribe to pin changes in real time.
 * Fires for INSERT and DELETE on live_pins.
 */
export function subscribeToPinsRealtime(
  onNewPin: (pin: LivePin) => void,
  onPinRemoved: (pinId: string) => void
): RealtimeChannel {
  if (pinsChannel) {
    supabase.removeChannel(pinsChannel);
  }

  pinsChannel = supabase
    .channel('live_pins_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'live_pins' },
      (payload) => {
        onNewPin(payload.new as LivePin);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'live_pins' },
      (payload) => {
        onPinRemoved((payload.old as any).id);
      }
    )
    .subscribe();

  return pinsChannel;
}

/** Unsubscribe from all community realtime channels */
export function unsubscribeAll(): void {
  if (chatChannel) {
    supabase.removeChannel(chatChannel);
    chatChannel = null;
  }
  if (pinsChannel) {
    supabase.removeChannel(pinsChannel);
    pinsChannel = null;
  }
}

// ── Helpers ──────────────────────────────────

/** Calculate distance between two points in miles (Haversine) */
export function distanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check if a point is within the community radius (15 mi) */
export function isWithinRadius(
  userLat: number, userLng: number,
  pointLat: number, pointLng: number
): boolean {
  return distanceMiles(userLat, userLng, pointLat, pointLng) <= 15;
}

/** Format pin expiry as relative time ("expires in 2h 15m") */
export function formatPinExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
