import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, APP_NAME } from '@constants/index';
import { useAuthStore, useWizardStore } from '@stores/index';

// Offshore → Inshore species mapping for backup reports
const OFFSHORE_TO_INSHORE: Record<string, string> = {
  'Mahi-Mahi': 'Redfish',
  'Yellowfin Tuna': 'Speckled Trout',
  'Wahoo': 'Spanish Mackerel',
  'Grouper': 'Sheepshead',
  'Snapper': 'Black Drum',
  'Amberjack': 'Flounder',
  'Blackfin Tuna': 'Cobia',
  'Sailfish': 'Tarpon',
};

export default function RootLayout() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const updateDraft = useWizardStore((s) => s.updateDraft);
  const router = useRouter();
  const notifListenerRef = useRef<any>(null);

  useEffect(() => {
    loadUser();

    // Listen for push notification taps (native only)
    if (Platform.OS !== 'web') {
      try {
        const Notifications = require('expo-notifications');

        // Handle notification tap — check for weather_change_alert action
        notifListenerRef.current = Notifications.addNotificationResponseReceivedListener(
          (response: any) => {
            const data = response?.notification?.request?.content?.data;
            if (data?.type === 'weather_change_alert' && data?.action === 'generate_inshore_backup') {
              // Pre-fill wizard with inshore species and navigate
              const today = new Date().toISOString().slice(0, 10);
              const inshoreSpecies = Object.values(OFFSHORE_TO_INSHORE).slice(0, 4);

              updateDraft({
                date: today,
                timeWindow: 'morning',
                accessType: 'boat',
                isOffshore: false,
                species: inshoreSpecies,
              });

              // Navigate to wizard step 2 (species already pre-selected, let user confirm)
              router.push('/wizard/step2');
            }
          }
        );
      } catch {}
    }

    return () => {
      if (notifListenerRef.current) {
        try {
          const Notifications = require('expo-notifications');
          Notifications.removeNotificationSubscription(notifListenerRef.current);
        } catch {}
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle:      { backgroundColor: COLORS.navy },
          headerTintColor:  COLORS.white,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle:     { backgroundColor: COLORS.navy },
        }}
      >
        <Stack.Screen name="index"  options={{ headerShown: false }} />
        <Stack.Screen name="login"  options={{ headerShown: false }} />
        <Stack.Screen name="tabs"   options={{ headerShown: false }} />
        <Stack.Screen name="wizard" options={{ title: 'Generate Report', headerBackTitle: 'Back' }} />
        <Stack.Screen name="report" options={{ title: 'Fishing Report', headerBackTitle: 'Back' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
