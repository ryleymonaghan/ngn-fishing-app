import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  COLORS,
  APP_NAME,
  FREE_REPORT_LIMIT,
  PRICING,
  OFFSHORE_SAFETY,
} from '@constants/index';
import { useAuthStore, useReportStore } from '@stores/index';
import { startCheckout, openCustomerPortal } from '@services/stripeService';
import { requestNotificationPermission, configureNotifications, getPendingAlerts } from '@services/notificationService';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

// ── Community / Social Links ──────────────────
const COMMUNITY_LINKS = [
  {
    label: 'NGN Facebook Group',
    sub: 'Join the community — share catches, spots, tips',
    url: 'https://www.facebook.com/groups/ngnfishing',
    icon: 'FB',
  },
  {
    label: 'Instagram @ngnfishing',
    sub: 'Follow for daily reports + species intel',
    url: 'https://www.instagram.com/ngnfishing',
    icon: 'IG',
  },
  {
    label: 'NGN Fishing Website',
    sub: 'ngnfishing.com — reports, maps, forecast',
    url: 'https://ngnfishing.com',
    icon: 'WEB',
  },
] as const;

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { reports }       = useReportStore();

  const reportsUsed    = user?.reportsUsed ?? reports.length;
  const reportsLeft    = Math.max(0, FREE_REPORT_LIMIT - reportsUsed);
  const isSubscribed   = user?.subscription?.isActive ?? false;
  const [boatLength, setBoatLength] = useState(
    String(user?.boatLengthFt ?? OFFSHORE_SAFETY.DEFAULT_BOAT_LENGTH_FT)
  );
  const [boatSpeed, setBoatSpeed] = useState(
    String(user?.boatSpeedMph ?? OFFSHORE_SAFETY.DEFAULT_BOAT_SPEED_MPH)
  );
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | null>(null);

  const handleUpgrade = async (tier: 'monthly' | 'annual') => {
    setCheckoutLoading(tier);
    try {
      await startCheckout(tier, user?.email);
    } catch (err: any) {
      Alert.alert('Checkout Error', err.message || 'Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?.email) return;
    try {
      await openCustomerPortal(user.email);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open subscription manager.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* App Identity */}
        <View style={s.header}>
          <Text style={s.appName}>{APP_NAME}</Text>
          <Text style={s.tagline}>No Guide Needed™</Text>
        </View>

        {/* Subscription Card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>SUBSCRIPTION</Text>
          {isSubscribed ? (
            <>
              <Text style={s.subStatus}>Active — {user?.subscription.tier}</Text>
              <Text style={s.subDetail}>
                {user?.subscription.tier === 'annual'
                  ? `$${PRICING.ANNUAL}/yr · Renews ${user?.subscription.expiresAt ?? '—'}`
                  : `$${PRICING.MONTHLY}/mo · Renews ${user?.subscription.expiresAt ?? '—'}`}
              </Text>
              <TouchableOpacity
                style={s.manageBtn}
                onPress={handleManageSubscription}
                activeOpacity={0.8}
              >
                <Text style={s.manageBtnText}>Manage Subscription</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.freeStatus}>
                Free — {reportsLeft} of {FREE_REPORT_LIMIT} reports remaining
              </Text>
              <View style={s.upgradeRow}>
                <TouchableOpacity
                  style={s.upgradePill}
                  activeOpacity={0.8}
                  onPress={() => handleUpgrade('monthly')}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === 'monthly' ? (
                    <ActivityIndicator color={COLORS.seafoam} size="small" />
                  ) : (
                    <Text style={s.upgradePillText}>Monthly · ${PRICING.MONTHLY}/mo</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.upgradePill, s.upgradePillBest]}
                  activeOpacity={0.8}
                  onPress={() => handleUpgrade('annual')}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === 'annual' ? (
                    <ActivityIndicator color={COLORS.navy} size="small" />
                  ) : (
                    <>
                      <Text style={s.upgradePillTextBest}>Annual · ${PRICING.ANNUAL}/yr</Text>
                      <Text style={s.saveBadge}>{PRICING.ANNUAL_LABEL}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Boat Settings */}
        <View style={s.card}>
          <Text style={s.cardLabel}>BOAT SETTINGS</Text>
          <Text style={s.fieldLabel}>Boat length (ft)</Text>
          <TextInput
            style={s.input}
            value={boatLength}
            onChangeText={setBoatLength}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
            placeholder={String(OFFSHORE_SAFETY.DEFAULT_BOAT_LENGTH_FT)}
          />
          <Text style={s.inputHint}>Used for offshore Go/No-Go safety rating</Text>

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>Boat speed (mph)</Text>
          <TextInput
            style={s.input}
            value={boatSpeed}
            onChangeText={setBoatSpeed}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
            placeholder={String(OFFSHORE_SAFETY.DEFAULT_BOAT_SPEED_MPH)}
          />
          <Text style={s.inputHint}>Used to calculate travel time to spots</Text>
        </View>

        {/* Account */}
        <View style={s.card}>
          <Text style={s.cardLabel}>ACCOUNT</Text>
          {user ? (
            <>
              <Text style={s.accountEmail}>{user.email}</Text>
              <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
                <Text style={s.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={s.anonText}>
              Not signed in — reports saved locally.{'\n'}Sign in to sync across devices.
            </Text>
          )}
        </View>

        {/* Notification Settings */}
        <View style={s.card}>
          <Text style={s.cardLabel}>NOTIFICATIONS</Text>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={async () => {
              const granted = await requestNotificationPermission();
              if (granted) {
                await configureNotifications();
                const pending = await getPendingAlerts();
                Alert.alert('Notifications Active', `Push notifications enabled. ${pending} alerts currently scheduled.`);
              } else {
                Alert.alert('Permission Denied', 'Enable notifications in your device settings to receive move-timing alerts and weather warnings.');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={s.notifBtnText}>Enable Push Notifications</Text>
            <Text style={s.notifBtnSub}>Move alerts, tide changes, weather warnings</Text>
          </TouchableOpacity>
        </View>

        {/* Community */}
        <View style={s.card}>
          <Text style={s.cardLabel}>COMMUNITY</Text>
          <Text style={s.communityIntro}>
            Join the NGN crew — share catches, swap intel, get better.
          </Text>
          {COMMUNITY_LINKS.map((link) => (
            <TouchableOpacity
              key={link.url}
              style={s.communityLink}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.8}
            >
              <View style={s.communityIcon}>
                <Text style={s.communityIconText}>{link.icon}</Text>
              </View>
              <View style={s.communityInfo}>
                <Text style={s.communityLabel}>{link.label}</Text>
                <Text style={s.communitySub}>{link.sub}</Text>
              </View>
              <Text style={s.communityArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <Text style={s.version}>NGN Fishing v0.1.0 · ngnfishing.com</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.navy },
  content:            { padding: 24, paddingBottom: 48 },
  header:             { marginBottom: 24 },
  appName:            { fontSize: 26, fontWeight: '700', color: COLORS.white },
  tagline:            { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: COLORS.navyLight,
    borderRadius:    12,
    padding:         16,
    marginBottom:    16,
  },
  cardLabel:          { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  subStatus:          { fontSize: 16, fontWeight: '600', color: COLORS.success },
  subDetail:          { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  freeStatus:         { fontSize: 15, fontWeight: '600', color: COLORS.warning, marginBottom: 14 },
  upgradeRow:         { gap: 10 },
  upgradePill: {
    backgroundColor: COLORS.navy,
    borderRadius:    10,
    padding:         14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.seafoam,
  },
  upgradePillBest:    { backgroundColor: COLORS.seafoam },
  upgradePillText:    { fontSize: 15, fontWeight: '600', color: COLORS.seafoam },
  upgradePillTextBest:{ fontSize: 15, fontWeight: '700', color: COLORS.navy },
  saveBadge:          { fontSize: 11, color: COLORS.navy, marginTop: 2, fontWeight: '600' },
  manageBtn: {
    marginTop:       12,
    borderWidth:     1,
    borderColor:     COLORS.seafoam,
    borderRadius:    10,
    padding:         12,
    alignItems:      'center' as const,
  },
  manageBtnText:     { fontSize: 14, fontWeight: '600', color: COLORS.seafoam },
  fieldLabel:         { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.navy,
    borderRadius:    8,
    padding:         12,
    color:           COLORS.white,
    fontSize:        15,
    borderWidth:     1,
    borderColor:     COLORS.navyLight,
  },
  inputHint:          { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  accountEmail:       { fontSize: 14, color: COLORS.white, marginBottom: 12 },
  signOutBtn: {
    backgroundColor: `${COLORS.danger}22`,
    borderRadius:    8,
    padding:         12,
    alignItems:      'center',
  },
  signOutText:        { color: COLORS.danger, fontWeight: '600', fontSize: 14 },
  anonText:           { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // Notification settings
  notifBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
  },
  notifBtnText:       { fontSize: 14, fontWeight: '600', color: COLORS.seafoam },
  notifBtnSub:        { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },

  // Community section
  communityIntro:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 20 },
  communityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  communityIcon: {
    width: 36,
    height: 36,
    backgroundColor: `${COLORS.seafoam}20`,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityIconText:  { fontSize: 11, fontWeight: '800', color: COLORS.seafoam, fontFamily: MONO, letterSpacing: 1 },
  communityInfo:      { flex: 1 },
  communityLabel:     { fontSize: 14, fontWeight: '600', color: COLORS.white },
  communitySub:       { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  communityArrow:     { fontSize: 16, color: COLORS.textMuted, paddingLeft: 8 },

  version:            { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
});
