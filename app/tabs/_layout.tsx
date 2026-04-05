import { Tabs } from 'expo-router';
import { COLORS } from '@constants/index';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.navy,
          borderTopColor:  COLORS.navyLight,
          borderTopWidth:  1,
        },
        tabBarActiveTintColor:   COLORS.seafoam,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerStyle:             { backgroundColor: COLORS.navy },
        headerTintColor:         COLORS.white,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:        'Conditions',
          tabBarLabel:  'Conditions',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title:       'My Reports',
          tabBarLabel: 'Reports',
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title:       'Spot Map',
          tabBarLabel: 'Map',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:       'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
