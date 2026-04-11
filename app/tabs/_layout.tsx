import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { COLORS } from '@constants/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

export default function TabLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const navigateTo = (route: string) => {
    setMenuOpen(false);
    // Small delay so modal closes before navigation
    setTimeout(() => router.push(route as any), 150);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#060E1A' },
          headerTintColor: '#E63946',
          headerTitleStyle: { fontFamily: MONO, letterSpacing: 3, fontSize: 18, fontWeight: '900' },
          headerRight: () => (
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.hamburger}>
              <Text style={s.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: '#060E1A',
            borderTopWidth: 1,
            borderTopColor: '#0D2B4A',
            height: Platform.OS === 'ios' ? 88 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: COLORS.seafoam,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: {
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 1.2,
            fontWeight: '700',
          },
        }}
      >
        {/* ── 3 primary tabs ─────────────────── */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'NGN FISHING',
            tabBarLabel: 'FORECAST',
            tabBarIcon: ({ color }) => <TabIcon icon="◉" color={color} />,
          }}
        />
        <Tabs.Screen
          name="spots"
          options={{
            title: 'SPOT MAP',
            headerShown: false,
            tabBarLabel: 'MAP',
            tabBarIcon: ({ color }) => <TabIcon icon="◎" color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'GENERATE REPORT',
            tabBarLabel: 'REPORT',
            tabBarIcon: ({ color }) => <TabIcon icon="▶" color={color} />,
          }}
        />

        {/* ── Hidden tabs — accessed via hamburger menu or navigation ── */}
        <Tabs.Screen name="shop"       options={{ href: null, title: 'GEAR SHOP' }} />
        <Tabs.Screen name="knots"      options={{ href: null, title: 'GUIDES' }} />
        <Tabs.Screen name="profile"    options={{ href: null, title: 'PROFILE' }} />
        <Tabs.Screen name="community"  options={{ href: null, title: 'COMMUNITY' }} />
        <Tabs.Screen name="triplog"    options={{ href: null, title: 'TRIP LOG' }} />
        <Tabs.Screen name="catches"       options={{ href: null, title: 'CATCHES' }} />
        <Tabs.Screen name="rigs"          options={{ href: null, title: 'RIG GUIDE' }} />
        <Tabs.Screen name="notifications" options={{ href: null, title: 'NOTIFICATIONS' }} />
      </Tabs>

      {/* ── Hamburger Menu Modal ─────────────── */}
      <Modal visible={menuOpen} animationType="fade" transparent onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={s.menuPanel}>
            {/* Close button */}
            <TouchableOpacity style={s.menuClose} onPress={() => setMenuOpen(false)}>
              <Text style={s.menuCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={s.menuTitle}>NGN FISHING</Text>

            <MenuItem label="Account" icon="◇" onPress={() => navigateTo('/tabs/profile')} />
            <MenuItem label="Trip Logs" icon="▤" onPress={() => navigateTo('/tabs/triplog')} />
            <MenuItem label="Notifications" icon="▣" onPress={() => navigateTo('/tabs/notifications')} />
            <MenuItem label="Crew Chat" icon="◈" onPress={() => navigateTo('/tabs/community')} />

            <View style={s.menuDivider} />

            <MenuItem label="Gear Shop" icon="◆" onPress={() => navigateTo('/tabs/shop')} />
            <MenuItem label="Guides & Knots" icon="⊞" onPress={() => navigateTo('/tabs/knots')} />
            <MenuItem label="Rig Setups" icon="⊟" onPress={() => navigateTo('/tabs/rigs')} />

            <View style={s.menuDivider} />

            <MenuItem label="Catches" icon="◐" onPress={() => navigateTo('/tabs/catches')} />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <View style={s.tabIconWrap}>
      <Text style={[s.tabIcon, { color }]}>{icon}</Text>
    </View>
  );
}

function MenuItem({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.menuItemIcon}>{icon}</Text>
      <Text style={s.menuItemLabel}>{label}</Text>
      <Text style={s.menuItemArrow}>→</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabIcon: {
    fontSize: 20,
  },

  // ── Hamburger button ──────────────────
  hamburger: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: COLORS.white,
  },

  // ── Menu overlay + panel ──────────────
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuPanel: {
    width: 260,
    backgroundColor: '#081E36',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0D2B4A',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    minHeight: '100%' as any,
  },
  menuClose: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  menuCloseText: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E63946',
    fontFamily: MONO,
    letterSpacing: 3,
    marginBottom: 24,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#0D2B4A',
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuItemIcon: {
    fontSize: 16,
    color: COLORS.seafoam,
    width: 28,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
    fontFamily: MONO,
    fontWeight: '600',
    letterSpacing: 1,
  },
  menuItemArrow: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
