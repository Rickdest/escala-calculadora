export const PLAN_STORE_LIMITS: Record<string, number> = {
  free: 0,
  monthly: 2,
  yearly: 7,
};

export const PRICING = {
  monthly: 39.90,
  monthlyLabel: "R$ 39,90",
  yearly: 197.00,
  yearlyLabel: "R$ 197,00",
  yearlySavingPct: 59,
  checkoutYearly: "https://pay.cakto.com.br/3d2fqxo",
  checkoutMonthly: "https://pay.cakto.com.br/secoc49_806849",
} as const;
