import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Pressable,
  StyleSheet, Dimensions, Platform,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, ROUTES } from '@constants/index';

const DRAWER_WIDTH = 260;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

const MENU_ITEMS = [
  { route: '/tabs',          label: 'CONDITIONS',   icon: '◉' },
  { route: '/tabs/spots',    label: 'SPOT MAP',     icon: '◎' },
  { route: '/tabs/reports',  label: 'PAST REPORTS', icon: '◫' },
  { route: '/tabs/triplog',  label: 'TRIP LOG',     icon: '◆' },
  { route: '/tabs/profile',  label: 'PROFILE',      icon: '◇' },
];

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();

  const toggleDrawer = useCallback(() => {
    const opening = !drawerOpen;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: opening ? 0 : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: opening ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    setDrawerOpen(opening);
  }, [drawerOpen]);

  const navigateTo = (route: string) => {
    toggleDrawer();
    setTimeout(() => router.push(route as any), 120);
  };

  const handleGenerateReport = () => {
    toggleDrawer();
    setTimeout(() => router.push(ROUTES.WIZARD.STEP_1 as any), 120);
  };

  return (
    <View style={s.root}>
      {/* ── Main content (Tabs with hidden tab bar) ── */}
      <Tabs
        screenOptions={{
          tabBarStyle: { display: 'none' },
          headerStyle: { backgroundColor: '#060E1A' },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontFamily: MONO, letterSpacing: 2, fontSize: 13 },
          headerLeft: () => (
            <TouchableOpacity onPress={toggleDrawer} style={s.hamburger} activeOpacity={0.7}>
              <Text style={s.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen name="index"   options={{ title: 'NGN FISHING' }} />
        <Tabs.Screen name="reports" options={{ title: 'PAST REPORTS' }} />
        <Tabs.Screen name="spots"   options={{ title: 'SPOT MAP', headerShown: false }} />
        <Tabs.Screen name="triplog" options={{ title: 'TRIP LOG' }} />
        <Tabs.Screen name="catches" options={{ title: 'CATCHES' }} />
        <Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
      </Tabs>

      {/* ── Overlay ── */}
      {drawerOpen && (
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleDrawer} />
        </Animated.View>
      )}

      {/* ── Slide-out drawer ── */}
      <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={s.drawerInner} edges={['top', 'bottom']}>
          {/* Brand */}
          <View style={s.drawerBrand}>
            <Text style={s.drawerLogo}>NGN</Text>
            <Text style={s.drawerSub}>FISHING</Text>
          </View>
          <View style={s.drawerRule} />

          {/* Nav items */}
          {MENU_ITEMS.map((item) => {
            const isHome = item.route === '/tabs';
            const active = isHome
              ? (pathname === '/' || pathname === '/tabs' || pathname === '/tabs/')
              : pathname === item.route;
            return (
              <TouchableOpacity
                key={item.route}
                style={[s.menuItem, active && s.menuItemActive]}
                onPress={() => navigateTo(item.route)}
                activeOpacity={0.7}
              >
                <Text style={[s.menuIcon, active && s.menuIconActive]}>{item.icon}</Text>
                <Text style={[s.menuLabel, active && s.menuLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Generate Report CTA */}
          <TouchableOpacity style={s.drawerCta} onPress={handleGenerateReport} activeOpacity={0.8}>
            <Text style={s.drawerCtaText}>GENERATE REPORT</Text>
            <Text style={s.drawerCtaArrow}>→</Text>
          </TouchableOpacity>

          {/* Version */}
          <Text style={s.drawerVersion}>v0.1.0 · No Guide Needed™</Text>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060E1A' },

  // Hamburger button
  hamburger: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: COLORS.seafoam,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },

  // Drawer
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#060E1A',
    borderRightWidth: 1,
    borderRightColor: '#0D2B4A',
    zIndex: 20,
    elevation: 20,
  },
  drawerInner: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },

  // Brand
  drawerBrand: {
    marginBottom: 8,
  },
  drawerLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.seafoam,
    letterSpacing: 6,
    fontFamily: MONO,
  },
  drawerSub: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 4,
    marginTop: -3,
    fontFamily: MONO,
  },
  drawerRule: {
    height: 1,
    backgroundColor: COLORS.seafoam,
    opacity: 0.2,
    marginVertical: 16,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 2,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  menuItemActive: {
    borderLeftColor: COLORS.seafoam,
    backgroundColor: `${COLORS.seafoam}08`,
  },
  menuIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  menuIconActive: {
    color: COLORS.seafoam,
  },
  menuLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    fontWeight: '500',
  },
  menuLabelActive: {
    color: COLORS.seafoam,
    fontWeight: '700',
  },

  // Generate Report CTA — red outline
  drawerCta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E74C3C',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  drawerCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E74C3C',
    fontFamily: MONO,
    letterSpacing: 2,
  },
  drawerCtaArrow: {
    fontSize: 16,
    color: '#E74C3C',
    fontFamily: MONO,
  },

  // Version
  drawerVersion: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    textAlign: 'center',
    opacity: 0.5,
  },
});
