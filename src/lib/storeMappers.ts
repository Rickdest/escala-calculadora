import { Store, Product, StoreConfig, DEFAULT_STORE_CONFIG, ShopeeAceleraOption } from '@/types/store';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

export const LOCAL_IMAGES_KEY = 'precify-local-images';
export const CURRENT_STORE_KEY = 'precify-current-store';
export const MIGRATION_DONE_KEY = 'precify-images-migrated';

export function getLocalImages(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LOCAL_IMAGES_KEY) || '{}'); } catch { return {}; }
}

export interface VariationRecord {
  stockQuantity?: number;
}

export function mapDbProduct(p: Tables<'products'>): Product {
  const variations = (p.variations ?? []) as unknown as Product['variations'];
  const attributes = (p.attributes ?? []) as unknown as Product['attributes'];
  const hasVariations = p.has_variations ?? false;
  const stockQuantity = hasVariations && variations.length > 0
    ? variations.reduce((sum: number, v: VariationRecord) => sum + (Number(v.stockQuantity) || 0), 0)
    : Number(p.stock_quantity ?? 0);

  const localImages = getLocalImages();
  const imageUrl = p.image_url || localImages[p.id] || undefined;

  return {
    id: p.id,
    storeId: p.store_id,
    name: p.name,
    category: p.category || undefined,
    description: p.description || undefined,
    costPrice: Number(p.cost_price),
    salePrice: Number(p.sale_price),
    packagingCost: Number(p.packaging_cost ?? 0),
    adsCost: Number(p.ads_cost ?? 0),
    adsRevenue: Number(p.ads_revenue ?? 0),
    imageUrl,
    stockQuantity,
    minStockQuantity: Number(p.min_stock_quantity ?? 5),
    hasVariations,
    attributes,
    variations,
    shopeeAcelera: (p.shopee_acelera as ShopeeAceleraOption) ?? 'none',
    outrosCanais: (p.outros_canais as unknown as Product['outrosCanais']) ?? undefined,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
  };
}

export function mapDbStore(s: Tables<'stores'>, products: Product[]): Store {
  return {
    id: s.id,
    name: s.name,
    config: {
      isCpfSeller: s.is_cpf_seller ?? false,
      hasOver450Orders: s.has_over_450_orders ?? false,
      taxes: Number(s.taxes ?? 0),
      desiredMargin: Number(s.desired_margin ?? 17),
      currency: 'BRL',
      enablePackaging: s.enable_packaging ?? true,
      enableAds: s.enable_ads ?? true,
      enableAffiliateCommission: s.enable_affiliate_commission ?? false,
      enableShopeeCampaigns: s.enable_shopee_campaigns ?? false,
      affiliateCommission: Number(s.affiliate_commission ?? 0),
      shopeeCampaigns: Number(s.shopee_campaigns ?? 0),
      shopeeAcelera: (s.shopee_acelera as ShopeeAceleraOption) || 'none',
    },
    products: products.filter(p => p.storeId === s.id),
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
  };
}

/** Fetches stores and products, auto-creates first store for new users */
export async function fetchStoresAndProducts(userId: string): Promise<Store[]> {
  const [{ data: storesData, error: storesErr }, { data: productsData, error: productsErr }] = await Promise.all([
    supabase.from('stores').select('*').eq('user_id', userId),
    supabase.from('products').select('*').eq('user_id', userId),
  ]);

  if (storesErr) throw storesErr;
  if (productsErr) throw productsErr;

  const products = (productsData || []).map((p) => mapDbProduct(p));
  const loaded = (storesData || []).map((s) => mapDbStore(s, products));

  if (loaded.length > 0) return loaded;

  // Auto-create first store for new users
  const insertData: TablesInsert<'stores'> = {
    name: 'Minha Loja',
    user_id: userId,
    taxes: DEFAULT_STORE_CONFIG.taxes,
    desired_margin: DEFAULT_STORE_CONFIG.desiredMargin,
    enable_packaging: DEFAULT_STORE_CONFIG.enablePackaging,
    enable_ads: DEFAULT_STORE_CONFIG.enableAds,
    affiliate_commission: DEFAULT_STORE_CONFIG.affiliateCommission,
    shopee_campaigns: DEFAULT_STORE_CONFIG.shopeeCampaigns,
  };
  const { data, error: createErr } = await supabase.from('stores').insert(insertData).select().single();

  if (createErr || !data) throw createErr || new Error('Falha ao criar loja');
  return [mapDbStore(data, [])];
}
