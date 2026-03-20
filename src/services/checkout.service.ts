/**
 * Checkout URL builder for Hotmart payments.
 * Centralizes all payment link logic.
 */

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';

export function buildCheckoutUrl(email?: string): string {
  const url = new URL(CHECKOUT_URL);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

export function openCheckout(email?: string) {
  window.open(buildCheckoutUrl(email), '_blank', 'noopener,noreferrer');
}
