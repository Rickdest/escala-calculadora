import type { Product } from '@/types/store';
import type { ProductPerformanceRow } from '@/lib/parsers/parseProductPerformanceExcel';

export type MatchType = 'saved' | 'itemId' | 'sku' | 'variationSku' | 'name' | null;

export interface MatchResult {
  productId: string | null;
  matchType: MatchType;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface SavedLink {
  shopee_item_id: string;
  product_id: string | null;
  manual_unit_cost: number | null;
  link_type: string;
}

export function matchShopeeProduct(
  row: ProductPerformanceRow,
  products: Product[],
  savedLinks: SavedLink[] = [],
): MatchResult {
  // 1. Saved link
  const saved = savedLinks.find((l) => l.shopee_item_id === row.item_id);
  if (saved && saved.product_id) {
    return { productId: saved.product_id, matchType: 'saved' };
  }

  // 2. Shopee item id
  const byItemId = products.find(
    (p) => p.shopeeItemId != null && String(p.shopeeItemId) === row.item_id,
  );
  if (byItemId) return { productId: byItemId.id, matchType: 'itemId' };

  // 3. Parent SKU — check any variation SKU on registered product
  if (row.parent_sku) {
    const target = row.parent_sku.toLowerCase().trim();
    const bySku = products.find((p) =>
      (p.variations || []).some((v) => (v.sku || '').toLowerCase().trim() === target),
    );
    if (bySku) return { productId: bySku.id, matchType: 'sku' };
  }

  // 4. Variation SKU
  if (row.variation_sku) {
    const target = row.variation_sku.toLowerCase().trim();
    const byVar = products.find((p) =>
      (p.variations || []).some((v) => (v.sku || '').toLowerCase().trim() === target),
    );
    if (byVar) return { productId: byVar.id, matchType: 'variationSku' };
  }

  // 5. Name similarity
  const rowTokens = tokens(row.nome);
  let best: { id: string; score: number } | null = null;
  for (const p of products) {
    const score = jaccard(rowTokens, tokens(p.name));
    if (score >= 0.6 && (!best || score > best.score)) {
      best = { id: p.id, score };
    }
  }
  if (best && best.score >= 0.6) return { productId: best.id, matchType: 'name' };

  return { productId: null, matchType: null };
}
