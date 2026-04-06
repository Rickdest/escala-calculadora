/**
 * Checkout URL builder for Cakto payments.
 * Centralizes all payment link logic.
 */

import { PRICING } from '@/constants/pricing';

const CHECKOUT_URL = import.meta.env.VITE_CAKTO_URL ?? '';

export function buildCheckoutUrl(email?: string): string | null {
  if (!CHECKOUT_URL) return null;
  try {
    const url = new URL(CHECKOUT_URL);
    if (email) url.searchParams.set('email', email);
    return url.toString();
  } catch {
    return null;
  }
}

export function openCheckout(email?: string) {
  const url = buildCheckoutUrl(email);
  const target = url || PRICING.checkoutMonthly;
  window.open(target, '_blank', 'noopener,noreferrer');
}
