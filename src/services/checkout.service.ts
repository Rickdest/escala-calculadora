/**
 * Checkout URL builder for Cakto payments.
 * Centralizes all payment link logic.
 */

const CHECKOUT_URL = import.meta.env.VITE_CAKTO_URL || 'https://pay.cakto.com.br/YOUR_PRODUCT_ID';

export function buildCheckoutUrl(email?: string): string {
  const url = new URL(CHECKOUT_URL);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

export function openCheckout(email?: string) {
  window.open(buildCheckoutUrl(email), '_blank', 'noopener,noreferrer');
}
