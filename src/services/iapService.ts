// ─────────────────────────────────────────────
// NGN Fishing — RevenueCat IAP Service (iOS)
// Wraps react-native-purchases for App Store IAP.
// ─────────────────────────────────────────────

import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';

const RC_KEY = Constants.expoConfig?.extra?.REVENUECAT_API_KEY ?? '';

const ENTITLEMENT_ID = 'pro';

// ── Initialize RevenueCat SDK ───────────────
export async function initializeRevenueCat(): Promise<void> {
  if (!RC_KEY) {
    console.warn('[IAP] No RevenueCat API key configured');
    return;
  }
  Purchases.configure({ apiKey: RC_KEY });
}

// ── Identify user (login) ───────────────────
export async function identifyUser(userId: string): Promise<void> {
  await Purchases.logIn(userId);
}

// ── Fetch available offerings ───────────────
export async function fetchOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages;
}

// ── Purchase a package ──────────────────────
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  return !!entitlement;
}

// ── Check entitlements ──────────────────────
export async function checkEntitlements(): Promise<{
  isPro: boolean;
  expiresAt: string | null;
}> {
  const customerInfo = await Purchases.getCustomerInfo();
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  if (entitlement) {
    return {
      isPro: true,
      expiresAt: entitlement.expirationDate ?? null,
    };
  }
  return { isPro: false, expiresAt: null };
}

// ── Restore purchases ──────────────────────
export async function restorePurchases(): Promise<{
  isPro: boolean;
  expiresAt: string | null;
}> {
  const customerInfo = await Purchases.restorePurchases();
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  if (entitlement) {
    return {
      isPro: true,
      expiresAt: entitlement.expirationDate ?? null,
    };
  }
  return { isPro: false, expiresAt: null };
}

// ── Logout ──────────────────────────────────
export async function logoutRevenueCat(): Promise<void> {
  await Purchases.logOut();
}
