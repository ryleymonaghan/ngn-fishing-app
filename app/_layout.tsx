import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, APP_NAME } from '@constants/index';
import { useAuthStore } from '@stores/index';

export default function RootLayout() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
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
        <Stack.Screen name="login"  options={{ headerShown: false }} />
        <Stack.Screen name="tabs"   options={{ headerShown: false }} />
        <Stack.Screen name="wizard" options={{ title: 'Generate Report', headerBackTitle: 'Back' }} />
        <Stack.Screen name="report" options={{ title: 'Fishing Report', headerBackTitle: 'Back' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
