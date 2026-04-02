/**
 * Checkout URL builder for Cakto payments.
 * Centralizes all payment link logic.
 */

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
  if (!url) {
    console.error('VITE_CAKTO_URL não configurado ou inválido');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
