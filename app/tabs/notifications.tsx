import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@constants/index';
import { useAuthStore, useConditionsStore } from '@stores/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

// ── Notification types ──────────────────────────
interface Notification {
  id: string;
  type: 'weather' | 'trip' | 'community';
  title: string;
  body: string;
  timestamp: string;
  actionLabel?: string;
  actionRoute?: string;
  coords?: { lat: number; lng: number };
}

// ── Demo notifications (will be replaced by real push data) ──
const DEMO_NOTIFICATIONS: Notification[] = [
  // Uncomment below to test with sample data:
  // {
  //   id: 'w1',
  //   type: 'weather',
  //   title: 'Wind Advisory',
  //   body: 'Winds increasing to 20+ mph by 2PM. Consider moving inshore.',
  //   timestamp: new Date().toISOString(),
  // },
  // {
  //   id: 't1',
  //   type: 'trip',
  //   title: 'Time to Relocate',
  //   body: 'Move to your next spot in 15 minutes. Tide is shifting.',
  //   timestamp: new Date().toISOString(),
  //   actionLabel: 'NAVIGATE',
  //   coords: { lat: 32.6512, lng: -79.9401 },
  // },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conditions } = useConditionsStore();
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  // Count by type
  const weatherNotifs = notifications.filter(n => n.type === 'weather');
  const tripNotifs = notifications.filter(n => n.type === 'trip');
  const communityNotifs = notifications.filter(n => n.type === 'community');

  const handleNavigate = useCallback((coords: { lat: number; lng: number }) => {
    // Navigate to map and center on coords
    router.push('/tabs/spots' as any);
    // TODO: pass coords to map via store or params
  }, [router]);

  const handlePostPin = useCallback(async () => {
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Enable location services to drop a pin for other anglers.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      Alert.alert(
        'Pin Dropped',
        `Shared your position (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) with Pro Anglers in your area.`,
        [{ text: 'OK' }],
      );
      // TODO: push pin to community feed via Supabase realtime
    } catch {
      Alert.alert('Error', 'Could not get your location. Try again.');
    }
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* ── WEATHER NOTIFICATIONS ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionIcon}>◉</Text>
          <Text style={s.sectionTitle}>WEATHER ALERTS</Text>
          <View style={[s.badge, weatherNotifs.length > 0 && s.badgeActive]}>
            <Text style={s.badgeText}>{weatherNotifs.length}</Text>
          </View>
        </View>
        {weatherNotifs.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No weather alerts — conditions look good.</Text>
          </View>
        ) : (
          weatherNotifs.map(n => (
            <View key={n.id} style={[s.notifCard, s.notifWeather]}>
              <Text style={s.notifTitle}>{n.title}</Text>
              <Text style={s.notifBody}>{n.body}</Text>
              <Text style={s.notifTime}>{formatTime(n.timestamp)}</Text>
            </View>
          ))
        )}

        {/* ── TRIP NOTIFICATIONS ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionIcon}>▶</Text>
          <Text style={s.sectionTitle}>TRIP NOTIFICATIONS</Text>
          <View style={[s.badge, tripNotifs.length > 0 && s.badgeActive]}>
            <Text style={s.badgeText}>{tripNotifs.length}</Text>
          </View>
        </View>
        {tripNotifs.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No active trip alerts. Start a report to enable smart relocation timing.</Text>
          </View>
        ) : (
          tripNotifs.map(n => (
            <View key={n.id} style={[s.notifCard, s.notifTrip]}>
              <Text style={s.notifTitle}>{n.title}</Text>
              <Text style={s.notifBody}>{n.body}</Text>
              {n.coords && (
                <TouchableOpacity
                  style={s.navBtn}
                  onPress={() => handleNavigate(n.coords!)}
                  activeOpacity={0.8}
                >
                  <Text style={s.navBtnIcon}>◎</Text>
                  <Text style={s.navBtnText}>{n.actionLabel ?? 'NAVIGATE'}</Text>
                </TouchableOpacity>
              )}
              <Text style={s.notifTime}>{formatTime(n.timestamp)}</Text>
            </View>
          ))
        )}

        {/* ── COMMUNITY NOTIFICATIONS ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionIcon}>◈</Text>
          <Text style={s.sectionTitle}>COMMUNITY</Text>
          <View style={[s.badge, communityNotifs.length > 0 && s.badgeActive]}>
            <Text style={s.badgeText}>{communityNotifs.length}</Text>
          </View>
        </View>
        {communityNotifs.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No community updates. Join the crew to see what others are catching.</Text>
          </View>
        ) : (
          communityNotifs.map(n => (
            <View key={n.id} style={[s.notifCard, s.notifCommunity]}>
              <Text style={s.notifTitle}>{n.title}</Text>
              <Text style={s.notifBody}>{n.body}</Text>
              <Text style={s.notifTime}>{formatTime(n.timestamp)}</Text>
            </View>
          ))
        )}

        {/* ── POST A PIN ── */}
        <View style={s.divider} />
        <TouchableOpacity style={s.postPinBtn} onPress={handlePostPin} activeOpacity={0.85}>
          <Text style={s.postPinIcon}>◉</Text>
          <View style={s.postPinTextWrap}>
            <Text style={s.postPinTitle}>DROP A PIN</Text>
            <Text style={s.postPinSub}>Share your location with fellow Pro Anglers</Text>
          </View>
          <Text style={s.postPinArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  content: { padding: 16 },

  // ── Section headers ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 14,
    color: COLORS.seafoam,
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  badge: {
    backgroundColor: '#0D2B4A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#E63946',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: '#0D2B4A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // ── Notification cards ──
  notifCard: {
    backgroundColor: '#0D2B4A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  notifWeather: {
    borderLeftColor: '#F59E0B',
  },
  notifTrip: {
    borderLeftColor: COLORS.seafoam,
  },
  notifCommunity: {
    borderLeftColor: '#8B5CF6',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
  },

  // ── Navigate button (trip notifs) ──
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.seafoam,
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 6,
  },
  navBtnIcon: {
    fontSize: 14,
    color: '#060E1A',
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#0D2B4A',
    marginVertical: 20,
  },

  // ── Post Pin CTA ──
  postPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E63946',
    borderRadius: 12,
    padding: 16,
  },
  postPinIcon: {
    fontSize: 20,
    color: '#FFF',
    marginRight: 12,
  },
  postPinTextWrap: { flex: 1 },
  postPinTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  postPinSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  postPinArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
});
