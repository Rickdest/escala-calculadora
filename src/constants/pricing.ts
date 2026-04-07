export const PLAN_STORE_LIMITS: Record<string, number> = {
  free: 0,
  pro: 2,
  monthly: 2,
  yearly: 7,
};

export const PRICING = {
  monthly: 39.90,
  monthlyLabel: "R$ 39,90",
  monthlyOriginal: 59.90,
  monthlyOriginalLabel: "R$ 59,90",
  monthlyDiscountPct: 33,
  yearly: 197.00,
  yearlyLabel: "R$ 197,00",
  yearlyOriginal: 497.00,
  yearlyOriginalLabel: "R$ 497,00",
  yearlySavingPct: 60,
  yearlySaving: 300,
  checkoutYearly: "https://pay.cakto.com.br/3d2fqxo",
  checkoutMonthly: "https://pay.cakto.com.br/secoc49_806849",
} as const;
