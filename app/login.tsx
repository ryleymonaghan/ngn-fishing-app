import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, PRICING } from '@constants/index';
import { startCheckout, type CheckoutTier } from '@services/stripeService';
import { useAuthStore } from '@stores/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuthStore();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutTier | null>(null);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      router.replace('/tabs' as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/tabs' as any);
  };

  const handleUpgrade = async (tier: CheckoutTier) => {
    setCheckoutLoading(tier);
    try {
      await startCheckout(tier, email || undefined);
    } catch (err: any) {
      Alert.alert('Checkout Error', err.message || 'Could not start checkout.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Brand Header */}
          <View style={s.brandBlock}>
            <Text style={s.brandMark}>NGN</Text>
            <Text style={s.brandSub}>FISHING</Text>
            <Text style={s.tagline}>No Guide Needed™</Text>
          </View>

          <Text style={s.heroText}>
            Your AI fishing guide for the Southeast coast.{'\n'}
            Less guessing. More catching.
          </Text>

          {/* ── Pricing Tiers ── */}
          <View style={s.tierSection}>
            <Text style={s.sectionLabel}>CHOOSE YOUR PLAN</Text>

            {/* ── Free Tier ── */}
            <View style={s.tierCard}>
              <View style={s.tierHeader}>
                <Text style={s.tierName}>FREE</Text>
                <Text style={s.tierPrice}>$0</Text>
              </View>
              <Text style={s.tierDetail}>• 3-day forecast dashboard</Text>
              <Text style={s.tierDetail}>• Live tides, weather, solunar</Text>
              <Text style={s.tierDetail}>• Species probability ratings</Text>
              <Text style={s.tierDetail}>• Catch photo sharing with NGN branding</Text>
              <Text style={s.tierDetailMuted}>• Full AI reports — ${PRICING.SINGLE_REPORT} each</Text>
            </View>

            {/* ── Pro ── */}
            <TouchableOpacity
              style={[s.tierCard, s.tierCardPro]}
              onPress={() => handleUpgrade('pro_monthly')}
              activeOpacity={0.85}
              disabled={checkoutLoading !== null}
            >
              <View style={s.tierHeader}>
                <View>
                  <Text style={s.tierNamePro}>PRO</Text>
                  <Text style={s.tierBadge}>MOST POPULAR</Text>
                </View>
                <View style={s.tierPriceBlock}>
                  <Text style={s.tierPricePro}>${PRICING.PRO_MONTHLY}</Text>
                  <Text style={s.tierPricePer}>/month</Text>
                </View>
              </View>
              {checkoutLoading === 'pro_monthly' ? (
                <ActivityIndicator color={COLORS.navy} style={{ marginTop: 12 }} />
              ) : (
                <>
                  <Text style={s.tierDetailPro}>• Unlimited AI fishing reports</Text>
                  <Text style={s.tierDetailPro}>• GPS spot coordinates + navigation</Text>
                  <Text style={s.tierDetailPro}>• Basic map with spot markers</Text>
                  <Text style={s.tierDetailPro}>• Push alerts — tides, weather, move timing</Text>
                  <Text style={s.tierDetailPro}>• Catch photo sharing with NGN branding</Text>
                  <Text style={s.tierDetailMutedPro}>or ${PRICING.PRO_ANNUAL}/yr — save 33%</Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Pro Angler ── */}
            <TouchableOpacity
              style={[s.tierCard, s.tierCardAngler]}
              onPress={() => handleUpgrade('angler_monthly')}
              activeOpacity={0.85}
              disabled={checkoutLoading !== null}
            >
              <View style={s.tierHeader}>
                <View>
                  <Text style={s.tierNameAngler}>PRO ANGLER</Text>
                  <Text style={s.tierBadgeAngler}>ALL ACCESS</Text>
                </View>
                <View style={s.tierPriceBlock}>
                  <Text style={s.tierPriceAngler}>${PRICING.ANGLER_MONTHLY}</Text>
                  <Text style={s.tierPricePerAngler}>/month</Text>
                </View>
              </View>
              {checkoutLoading === 'angler_monthly' ? (
                <ActivityIndicator color={COLORS.seafoam} style={{ marginTop: 12 }} />
              ) : (
                <>
                  <Text style={s.tierDetailAngler}>• Everything in Pro</Text>
                  <Text style={s.tierDetailAngler}>• Full relief shading + NOAA bathymetry</Text>
                  <Text style={s.tierDetailAngler}>• Depth contour overlays</Text>
                  <Text style={s.tierDetailAngler}>• Offshore reef + structure layers</Text>
                  <Text style={s.tierDetailAngler}>• Priority species intel updates</Text>
                  <Text style={s.tierDetailMutedAngler}>or ${PRICING.ANGLER_ANNUAL}/yr — save 25%</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.charterCompare}>
              A guided charter costs $400–$800.{'\n'}
              NGN Pro starts at ${PRICING.PRO_MONTHLY}/mo.
            </Text>

            {/* Skip — prominent, right after pricing */}
            <TouchableOpacity onPress={handleSkip} style={s.skipBtnTop}>
              <Text style={s.skipTextTop}>Skip for now — try the free forecast →</Text>
            </TouchableOpacity>
          </View>

          {/* ── Auth Form ── */}
          <View style={s.authSection}>
            <Text style={s.sectionLabel}>
              {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </Text>

            {mode === 'signup' && (
              <TextInput
                style={s.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={s.authBtn}
              onPress={handleAuth}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.navy} />
              ) : (
                <Text style={s.authBtnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Free Account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={s.toggleMode}
            >
              <Text style={s.toggleModeText}>
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={s.skipBtn}>
              <Text style={s.skipText}>Skip for now — try the free forecast →</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={s.footer}>
            NGN Fishing v0.1.0 · ngnfishing.com{'\n'}
            © {new Date().getFullYear()} Oak Angel Digital LLC
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060E1A' },
  content: { padding: 24, paddingBottom: 48 },

  // Brand
  brandBlock: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  brandMark: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.seafoam,
    letterSpacing: 10,
    fontFamily: MONO,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 8,
    marginTop: -4,
    fontFamily: MONO,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontFamily: MONO,
  },
  heroText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    marginTop: 12,
  },

  // Pricing section
  tierSection: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontFamily: MONO,
    marginBottom: 12,
  },

  // Free tier
  tierCard: {
    backgroundColor: '#081E36',
    borderWidth: 1,
    borderColor: '#0D2B4A',
    padding: 16,
    marginBottom: 10,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMuted,
    fontFamily: MONO,
  },
  tierDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tierDetailMuted: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Pro monthly
  tierCardPro: {
    borderColor: COLORS.seafoam,
    borderWidth: 2,
    backgroundColor: `${COLORS.seafoam}10`,
  },
  tierNamePro: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  tierBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#060E1A',
    backgroundColor: COLORS.seafoam,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    letterSpacing: 1,
    fontFamily: MONO,
    overflow: 'hidden',
  },
  tierPriceBlock: { alignItems: 'flex-end' },
  tierPricePro: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
  },
  tierPricePer: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  tierDetailPro: {
    fontSize: 12,
    color: COLORS.white,
    lineHeight: 22,
  },
  tierDetailMutedPro: {
    fontSize: 11,
    color: COLORS.seafoam,
    lineHeight: 22,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
  },

  // Pro Angler
  tierCardAngler: {
    borderColor: COLORS.warning,
    borderWidth: 2,
    backgroundColor: `${COLORS.warning}10`,
  },
  tierNameAngler: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.warning,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  tierBadgeAngler: {
    fontSize: 9,
    fontWeight: '700',
    color: '#060E1A',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    letterSpacing: 1,
    fontFamily: MONO,
    overflow: 'hidden',
  },
  tierPriceAngler: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.warning,
    fontFamily: MONO,
  },
  tierPricePerAngler: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  tierDetailAngler: {
    fontSize: 12,
    color: COLORS.white,
    lineHeight: 22,
  },
  tierDetailMutedAngler: {
    fontSize: 11,
    color: COLORS.warning,
    lineHeight: 22,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
  },
  charterCompare: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontFamily: MONO,
  },

  // Auth form
  authSection: { marginBottom: 24 },
  input: {
    backgroundColor: '#081E36',
    borderWidth: 1,
    borderColor: '#0D2B4A',
    padding: 14,
    color: COLORS.white,
    fontSize: 15,
    marginBottom: 10,
  },
  authBtn: {
    backgroundColor: COLORS.seafoam,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  authBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  toggleMode: { marginTop: 14, alignItems: 'center' },
  toggleModeText: { fontSize: 13, color: COLORS.seafoam },
  skipBtn: { marginTop: 16, alignItems: 'center' },
  skipText: { fontSize: 12, color: COLORS.textMuted },
  skipBtnTop: {
    marginTop: 18,
    alignItems: 'center',
    backgroundColor: `${COLORS.seafoam}15`,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.seafoam}40`,
  },
  skipTextTop: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.seafoam,
  },

  // Footer
  footer: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    opacity: 0.5,
  },
});
