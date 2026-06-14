// ─────────────────────────────────────────────
// NGN Fishing — Subscription Service
// Platform-branching wrapper: iOS → RevenueCat, Web → Stripe
// ─────────────────────────────────────────────

import { Platform, Linking } from 'react-native';

// ── iOS imports (lazy — tree-shaken on web) ──
const iap = Platform.OS === 'ios'
  ? require('./iapService')
  : null;

// ── Web imports ─────────────────────────────
import { checkSubscription, startCheckout, openCustomerPortal } from './stripeService';

// ── Initialize payment system ───────────────
export async function initPayments(): Promise<void> {
  if (Platform.OS === 'ios' && iap) {
    await iap.initializeRevenueCat();
  }
  // Web: no initialization needed
}

// ── Get subscription status ─────────────────
export async function getSubscriptionStatus(
  email?: string
): Promise<{ isPro: boolean; expiresAt: string | null }> {
  if (Platform.OS === 'ios' && iap) {
    return iap.checkEntitlements();
  }
  // Web: use Stripe
  if (!email) return { isPro: false, expiresAt: null };
  const status = await checkSubscription(email);
  return {
    isPro: status.isActive,
    expiresAt: status.expiresAt ?? null,
  };
}

// ── Start a purchase ────────────────────────
export async function startPurchase(
  tier: 'pro_monthly' | 'pro_annual',
  email?: string
): Promise<void> {
  if (Platform.OS === 'ios' && iap) {
    const packages = await iap.fetchOfferings();
    // Match package by identifier — RevenueCat uses $rc_monthly / $rc_annual
    const identifierMap: Record<string, string> = {
      pro_monthly: '$rc_monthly',
      pro_annual: '$rc_annual',
    };
    const targetId = identifierMap[tier];
    const pkg = packages.find(
      (p: any) => p.packageType === targetId || p.identifier === targetId
    );
    if (!pkg && packages.length > 0) {
      // Fallback: pick first package if no exact match
      await iap.purchasePackage(packages[0]);
      return;
    }
    if (pkg) {
      await iap.purchasePackage(pkg);
    }
    return;
  }
  // Web: Stripe checkout
  await startCheckout(tier, email);
}

// ── Restore purchases (iOS only) ────────────
export async function restoreSubscription(): Promise<{
  isPro: boolean;
  expiresAt: string | null;
}> {
  if (Platform.OS === 'ios' && iap) {
    return iap.restorePurchases();
  }
  // Web: no-op
  return { isPro: false, expiresAt: null };
}

// ── Manage subscription ─────────────────────
export async function manageSubscription(email?: string): Promise<void> {
  if (Platform.OS === 'ios') {
    // Deep-link to App Store subscription management
    await Linking.openURL('https://apps.apple.com/account/subscriptions');
    return;
  }
  // Web: Stripe customer portal
  if (email) {
    await openCustomerPortal(email);
  }
}

// ── Identify user for payment system ────────
export async function identifyUser(userId: string): Promise<void> {
  if (Platform.OS === 'ios' && iap) {
    await iap.identifyUser(userId);
  }
  // Web: no-op
}

// ── Logout from payment system ──────────────
export async function logoutPayments(): Promise<void> {
  if (Platform.OS === 'ios' && iap) {
    await iap.logoutRevenueCat();
  }
  // Web: no-op
}
