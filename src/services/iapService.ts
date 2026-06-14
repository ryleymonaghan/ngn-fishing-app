// ─────────────────────────────────────────────
// NGN Fishing — IAP Service (iOS) — STUB
// RevenueCat will be wired in a future build.
// For V1 launch, subscriptions use Stripe (web).
// ─────────────────────────────────────────────

// ── Initialize (no-op) ─────────────────────
export async function initializeRevenueCat(): Promise<void> {
  console.log('[IAP] RevenueCat not yet integrated — using Stripe');
}

// ── Identify user (no-op) ──────────────────
export async function identifyUser(_userId: string): Promise<void> {}

// ── Fetch offerings (empty) ────────────────
export async function fetchOfferings(): Promise<any[]> {
  return [];
}

// ── Purchase (no-op) ───────────────────────
export async function purchasePackage(_pkg: any): Promise<boolean> {
  return false;
}

// ── Check entitlements (no-op) ─────────────
export async function checkEntitlements(): Promise<{
  isPro: boolean;
  expiresAt: string | null;
}> {
  return { isPro: false, expiresAt: null };
}

// ── Restore purchases (no-op) ──────────────
export async function restorePurchases(): Promise<{
  isPro: boolean;
  expiresAt: string | null;
}> {
  return { isPro: false, expiresAt: null };
}

// ── Logout (no-op) ─────────────────────────
export async function logoutRevenueCat(): Promise<void> {}
