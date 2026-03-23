import { z } from 'zod';

// === Product Form ===
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  costPrice: z.number().positive('Custo deve ser maior que zero').max(999999, 'Valor muito alto'),
  salePrice: z.number().positive('Preço deve ser maior que zero').max(999999, 'Valor muito alto'),
  packagingCost: z.number().min(0, 'Valor inválido').max(99999, 'Valor muito alto').default(0),
  adsCost: z.number().min(0, 'Valor inválido').max(99999, 'Valor muito alto').default(0),
});

export type ProductFormData = z.infer<typeof productSchema>;

// === Store Settings ===
export const storeSettingsSchema = z.object({
  desiredMargin: z.number().min(0, 'Margem inválida').max(100, 'Margem máxima é 100%'),
  taxes: z.number().min(0, 'Imposto inválido').max(100, 'Imposto máximo é 100%'),
  affiliateCommission: z.number().min(0).max(100).default(0),
  shopeeCampaigns: z.number().min(0).max(100).default(0),
});

export type StoreSettingsData = z.infer<typeof storeSettingsSchema>;

// === Quick Calculator ===
export const quickCalcSchema = z.object({
  costPrice: z.number().positive('Custo deve ser maior que zero').max(999999),
  salePrice: z.number().positive('Preço deve ser maior que zero').max(999999),
  packaging: z.number().min(0).max(99999).default(0),
});

/** Validate and return errors as a Record<field, message> or null if valid */
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0]?.toString() || 'unknown';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
