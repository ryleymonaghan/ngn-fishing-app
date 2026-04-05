module.exports = {
  expo: {
    name: 'NGN Fishing',
    slug: 'ngn-fishing',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'ngnfishing',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0A2540',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.oakangeldigital.ngnfishing',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'NGN Fishing uses your location to find nearby fishing spots and tide stations.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'NGN Fishing uses your location to send you alerts when it\'s time to move to your next fishing spot.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0A2540',
      },
      package: 'com.oakangeldigital.ngnfishing',
      versionCode: 1,
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/icon.png',
    },
    newArchEnabled: true,
    plugins: [
      'expo-router',
      'expo-location',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#0A2540',
          sounds: [],
        },
      ],
      'expo-asset',
      'expo-font',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '',
      ANTHROPIC_API_KEY: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
      BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://ngn-fishing-backend-production.up.railway.app',
      eas: {
        projectId: 'REPLACE_WITH_EAS_PROJECT_ID',
      },
    },
  },
};
