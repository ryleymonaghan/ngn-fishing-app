// ─────────────────────────────────────────────
// NGN Fishing — Stripe Subscription Service
// All Stripe calls go through the Railway backend.
// No Stripe secret key in the client bundle.
// ─────────────────────────────────────────────

import { Platform, Linking } from 'react-native';
import { STRIPE_PRODUCTS } from '@constants/index';

// ── Backend URL ──────────────────────────────
const BACKEND =
  Platform.OS === 'web'
    ? '' // web uses relative proxy or same-origin
    : 'https://ngn-fishing-backend-production.up.railway.app';

const API = `${BACKEND}/api/stripe`;

// ── Types ────────────────────────────────────
export interface SubscriptionStatus {
  isActive: boolean;
  status?: string;        // 'active' | 'trialing' | 'past_due' | 'canceled'
  tier?: 'monthly' | 'annual' | null;
  priceId?: string;
  customerId?: string;
  subscriptionId?: string;
  currentPeriodEnd?: string;
  expiresAt?: string;
}

// ── Check subscription status by email ───────
export async function checkSubscription(email: string): Promise<SubscriptionStatus> {
  try {
    const res = await fetch(`${API}/subscription?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      console.warn('[Stripe] Subscription check failed:', res.status);
      return { isActive: false };
    }
    return await res.json();
  } catch (err: any) {
    console.error('[Stripe] checkSubscription error:', err.message);
    return { isActive: false };
  }
}

// ── Create checkout session & redirect ───────
export type CheckoutTier =
  | 'single_report'
  | 'pro_monthly' | 'pro_annual'
  | 'angler_monthly' | 'angler_annual';

export async function startCheckout(
  tier: CheckoutTier,
  customerEmail?: string
): Promise<string | null> {
  try {
    const priceMap: Record<CheckoutTier, string> = {
      single_report:   STRIPE_PRODUCTS.SINGLE_REPORT_PRICE_ID,
      pro_monthly:     STRIPE_PRODUCTS.PRO_MONTHLY_PRICE_ID,
      pro_annual:      STRIPE_PRODUCTS.PRO_ANNUAL_PRICE_ID,
      angler_monthly:  STRIPE_PRODUCTS.ANGLER_MONTHLY_PRICE_ID,
      angler_annual:   STRIPE_PRODUCTS.ANGLER_ANNUAL_PRICE_ID,
    };
    const priceId = priceMap[tier];

    const res = await fetch(`${API}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        customerEmail,
        successUrl: 'https://ngnfishing.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://ngnfishing.com/cancel',
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Checkout failed: ${res.status}`);
    }

    const { url } = await res.json();

    if (url) {
      // Open Stripe Checkout in browser
      await Linking.openURL(url);
    }

    return url;
  } catch (err: any) {
    console.error('[Stripe] startCheckout error:', err.message);
    throw err;
  }
}

// ── Open customer portal (manage/cancel) ─────
export async function openCustomerPortal(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        returnUrl: 'https://ngnfishing.com',
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Portal failed: ${res.status}`);
    }

    const { url } = await res.json();

    if (url) {
      await Linking.openURL(url);
    }

    return url;
  } catch (err: any) {
    console.error('[Stripe] openCustomerPortal error:', err.message);
    throw err;
  }
}
