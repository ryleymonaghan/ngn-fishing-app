import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS } from '@constants/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#060E1A' },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontFamily: MONO, letterSpacing: 2, fontSize: 13 },
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
          fontSize: 9,
          letterSpacing: 1,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NGN FISHING',
          tabBarLabel: 'HOME',
          tabBarIcon: ({ color }) => <TabIcon icon="◉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title: 'SPOT MAP',
          headerShown: false,
          tabBarLabel: 'SPOTS',
          tabBarIcon: ({ color }) => <TabIcon icon="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'REPORTS',
          tabBarLabel: 'REPORTS',
          tabBarIcon: ({ color }) => <TabIcon icon="◫" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'COMMUNITY',
          headerShown: false,
          tabBarLabel: 'CREW',
          tabBarIcon: ({ color }) => <TabIcon icon="📡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'GEAR SHOP',
          tabBarLabel: 'SHOP',
          tabBarIcon: ({ color }) => <TabIcon icon="🏷" color={color} />,
        }}
      />
      <Tabs.Screen
        name="knots"
        options={{
          title: 'GUIDES',
          tabBarLabel: 'GUIDES',
          tabBarIcon: ({ color }) => <TabIcon icon="⚓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ color }) => <TabIcon icon="◇" color={color} />,
        }}
      />

      {/* Hidden tabs — accessible via navigation but not shown in tab bar */}
      <Tabs.Screen name="triplog"  options={{ href: null, title: 'TRIP LOG' }} />
      <Tabs.Screen name="catches"  options={{ href: null, title: 'CATCHES' }} />
      <Tabs.Screen name="rigs"     options={{ href: null, title: 'RIG GUIDE' }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <View style={s.tabIconWrap}>
      <Text style={[s.tabIcon, { color }]}>{icon}</Text>
    </View>
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
});
