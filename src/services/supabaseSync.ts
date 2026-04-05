// ─────────────────────────────────────────────
// NGN Fishing — Supabase Sync Service
// Persists reports, saved spots, and user profile
// to Supabase PostgreSQL. Falls back to local
// AsyncStorage if offline.
// ─────────────────────────────────────────────

import { supabase } from '@lib/supabase';
import type { FishingReport, FishingSpot, UserProfile } from '@app-types/index';

// ── Reports ──────────────────────────────────

/** Save a generated report to Supabase */
export async function saveReportToCloud(userId: string, report: FishingReport): Promise<void> {
  try {
    const { error } = await supabase
      .from('reports')
      .upsert({
        id:           report.id,
        user_id:      userId,
        generated_at: report.generatedAt,
        input:        report.input,
        conditions_summary: report.conditionsSummary,
        species:      report.species,
        schedule:     report.schedule,
        pro_tips:     report.proTips,
        bait_finder_tip: report.baitFinderTip ?? null,
        offshore_go_no_go: report.offshoreGoNoGo ?? null,
        conditions:   report.conditions,
      }, { onConflict: 'id' });

    if (error) console.warn('[supabaseSync] saveReport error:', error.message);
  } catch (err) {
    console.warn('[supabaseSync] saveReport offline — using local storage');
  }
}

/** Fetch all reports for a user from Supabase */
export async function fetchReportsFromCloud(userId: string): Promise<FishingReport[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[supabaseSync] fetchReports error:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id:                row.id,
      generatedAt:       row.generated_at,
      input:             row.input,
      conditions:        row.conditions,
      conditionsSummary: row.conditions_summary,
      species:           row.species,
      schedule:          row.schedule,
      proTips:           row.pro_tips,
      baitFinderTip:     row.bait_finder_tip,
      offshoreGoNoGo:    row.offshore_go_no_go,
    }));
  } catch {
    console.warn('[supabaseSync] fetchReports offline');
    return [];
  }
}

// ── Saved Spots ─────────────────────────────

/** Save a fishing spot to user's saved spots */
export async function saveSpotToCloud(userId: string, spot: FishingSpot, speciesName?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('saved_spots')
      .upsert({
        id:          spot.id,
        user_id:     userId,
        name:        spot.name,
        lat:         spot.coordinates.lat,
        lng:         spot.coordinates.lng,
        depth_ft:    spot.depthFt ?? null,
        notes:       spot.notes,
        access_type: spot.accessType,
        species:     speciesName ?? null,
        saved_at:    new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) console.warn('[supabaseSync] saveSpot error:', error.message);
  } catch {
    console.warn('[supabaseSync] saveSpot offline');
  }
}

/** Fetch all saved spots for a user */
export async function fetchSavedSpots(userId: string): Promise<(FishingSpot & { speciesName?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('saved_spots')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) {
      console.warn('[supabaseSync] fetchSpots error:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id:          row.id,
      name:        row.name,
      coordinates: { lat: row.lat, lng: row.lng },
      depthFt:     row.depth_ft,
      notes:       row.notes,
      accessType:  row.access_type,
      speciesName: row.species,
    }));
  } catch {
    return [];
  }
}

/** Delete a saved spot */
export async function deleteSpotFromCloud(spotId: string): Promise<void> {
  try {
    await supabase.from('saved_spots').delete().eq('id', spotId);
  } catch {}
}

// ── User Profile ─────────────────────────────

/** Sync user profile to Supabase */
export async function syncUserProfile(profile: UserProfile): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id:             profile.id,
        email:          profile.email,
        full_name:      profile.fullName ?? null,
        boat_length_ft: profile.boatLengthFt,
        boat_speed_mph: profile.boatSpeedMph,
        home_station:   profile.homeStation,
        reports_used:   profile.reportsUsed,
        subscription_tier:   profile.subscription.tier,
        subscription_active: profile.subscription.isActive,
        subscription_expires: profile.subscription.expiresAt ?? null,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) console.warn('[supabaseSync] syncProfile error:', error.message);
  } catch {
    console.warn('[supabaseSync] syncProfile offline');
  }
}

/** Fetch user profile from Supabase */
export async function fetchUserProfile(userId: string): Promise<Partial<UserProfile> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      id:           data.id,
      email:        data.email,
      fullName:     data.full_name,
      boatLengthFt: data.boat_length_ft,
      boatSpeedMph: data.boat_speed_mph,
      homeStation:  data.home_station,
      reportsUsed:  data.reports_used,
      subscription: {
        isActive:  data.subscription_active,
        tier:      data.subscription_tier,
        expiresAt: data.subscription_expires,
      },
    };
  } catch {
    return null;
  }
}

// ── Trip Logs ────────────────────────────────

export interface TripLogEntry {
  id: string;
  userId: string;
  reportId?: string;
  location: string;
  speciesCaught: string[];
  baitUsed: string[];
  rating: number;        // 1-5
  notes: string;
  shareCoordinates: boolean;
  photos: string[];      // URIs
  createdAt: string;
}

/** Save a trip log to Supabase */
export async function saveTripLog(trip: TripLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('trip_logs')
      .insert({
        id:                trip.id,
        user_id:           trip.userId,
        report_id:         trip.reportId ?? null,
        location:          trip.location,
        species_caught:    trip.speciesCaught,
        bait_used:         trip.baitUsed,
        rating:            trip.rating,
        notes:             trip.notes,
        share_coordinates: trip.shareCoordinates,
        photo_count:       trip.photos.length,
        created_at:        trip.createdAt,
      });

    if (error) console.warn('[supabaseSync] saveTripLog error:', error.message);
  } catch {
    console.warn('[supabaseSync] saveTripLog offline');
  }
}

/** Fetch trip logs for a user */
export async function fetchTripLogs(userId: string): Promise<TripLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('trip_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return [];

    return (data ?? []).map((row: any) => ({
      id:               row.id,
      userId:           row.user_id,
      reportId:         row.report_id,
      location:         row.location,
      speciesCaught:    row.species_caught,
      baitUsed:         row.bait_used,
      rating:           row.rating,
      notes:            row.notes,
      shareCoordinates: row.share_coordinates,
      photos:           [],
      createdAt:        row.created_at,
    }));
  } catch {
    return [];
  }
}
