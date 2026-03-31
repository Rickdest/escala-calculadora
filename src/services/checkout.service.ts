/**
 * Checkout URL builder for Cakto payments.
 * Centralizes all payment link logic.
 */

const CHECKOUT_URL = import.meta.env.VITE_CAKTO_URL ?? '';

export function buildCheckoutUrl(email?: string): string {
  const url = new URL(CHECKOUT_URL);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

export function openCheckout(email?: string) {
  if (!CHECKOUT_URL) {
    console.error('VITE_CAKTO_URL não configurado');
    return;
  }
  window.open(buildCheckoutUrl(email), '_blank', 'noopener,noreferrer');
}
