// ─── Interfaces ───

export interface ParsedAdMetric {
  shopeeProductId: string;
  shopeeProductName: string;
  periodStart: string;
  periodEnd: string;
  impressions: number;
  clicks: number;
  itemsSold: number;
  gmv: number;
  spend: number;
  roas: number;
  acos: number;
  avgPosition: number | null;
  ctr: number;
  convRate: number;
  directRoas: number;
  directAcos: number;
  costPerConv: number;
}

export interface ParsedAdsFile {
  format: 'general' | 'product';
  shopName: string;
  period: string;
  metrics: ParsedAdMetric[];
}

// Derived fields (calculated on the fly, not stored)
export interface AdMetricDerived extends ParsedAdMetric {
  liquidReturn: number;
  roi: number;
  cpc: number;
  costPerSale: number;
}

export function deriveMetrics(m: ParsedAdMetric): AdMetricDerived {
  return {
    ...m,
    liquidReturn: m.gmv - m.spend,
    roi: m.spend > 0 ? ((m.gmv - m.spend) / m.spend) * 100 : 0,
    cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
    costPerSale: m.itemsSold > 0 ? m.spend / m.itemsSold : 0,
  };
}

// Legacy re-exports for backward compatibility
export type ShopeeAdRow = AdMetricDerived & {
  index: number;
  adName: string;
  status: string;
  adType: string;
  productId: string;
  positioning: string;
  keyword: string;
  matchType: string;
  bidMethod: string;
  conversions: number;
  directConversions: number;
  conversionRate: number;
  directItemsSold: number;
  directRevenue: number;
  rentability: number;
  productImpressions: number;
  productClicks: number;
  productCtr: number;
};

export interface ShopeeAdsReport {
  shopName: string;
  storeId: string;
  period: string;
  createdAt: string;
  ads: ShopeeAdRow[];
  totals: {
    totalSpend: number;
    totalGmv: number;
    totalItemsSold: number;
    avgRoas: number;
    avgAcos: number;
    totalLiquidReturn: number;
    avgRoi: number;
  };
}

// ─── Helpers ───

function parseNumber(val: string): number {
  if (!val || val === '-' || val === '') return 0;
  const cleaned = val.replace('%', '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

function parseBRNumber(val: string): number {
  if (!val || val === '-' || val === '') return 0;
  // Handle BR format: 1.234,56 → 1234.56
  const cleaned = val.replace(/\s/g, '').replace('%', '');
  // Check if it uses BR format (has comma as decimal separator)
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePeriod(periodStr: string): { start: string; end: string } {
  // Try to extract dates from period string like "20/02/2026 - 20/03/2026"
  const match = periodStr.match(/(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})/);
  if (match) {
    const [, s, e] = match;
    // Convert dd/mm/yyyy to yyyy-mm-dd
    const toISO = (d: string) => {
      const [dd, mm, yyyy] = d.split('/');
      return `${yyyy}-${mm}-${dd}`;
    };
    return { start: toISO(s), end: toISO(e) };
  }
  const today = new Date().toISOString().slice(0, 10);
  return { start: today, end: today };
}

// ─── Format A: "Dados Gerais" (General) ───

interface GeneralColumnMap {
  adName: number;
  status: number;
  adType: number;
  productId: number;
  bidMethod: number;
  positioning: number;
  keyword: number;
  matchType: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  directConversions: number;
  conversionRate: number;
  acos: number;
  directAcos: number;
  costPerConversion: number;
  itemsSold: number;
  directItemsSold: number;
  gmv: number;
  directRevenue: number;
  spend: number;
  roas: number;
  directRoas: number;
  productImpressions: number;
  productClicks: number;
  productCtr: number;
}

function detectGeneralColumnMap(headerCols: string[]): GeneralColumnMap {
  const colCount = headerCols.length;
  const hasKeyword = colCount >= 33;

  if (hasKeyword) {
    return {
      adName: 1, status: 2, adType: 3, productId: 4,
      bidMethod: 6, positioning: 7, keyword: 8, matchType: 9,
      impressions: 12, clicks: 13, ctr: 14,
      conversions: 15, directConversions: 16, conversionRate: 17,
      acos: 18, directAcos: 19, costPerConversion: 20,
      itemsSold: 21, directItemsSold: 22,
      gmv: 23, directRevenue: 24, spend: 25,
      roas: 26, directRoas: 27,
      productImpressions: 29, productClicks: 30, productCtr: 31,
    };
  }

  return {
    adName: 1, status: 2, adType: 3, productId: 4,
    bidMethod: 5, positioning: 6, keyword: -1, matchType: -1,
    impressions: 10, clicks: 11, ctr: 12,
    conversions: 13, directConversions: 14, conversionRate: 15,
    acos: 16, directAcos: 17, costPerConversion: 18,
    itemsSold: 19, directItemsSold: 20,
    gmv: 21, directRevenue: 22, spend: 23,
    roas: 24, directRoas: 25,
    productImpressions: 27, productClicks: 28, productCtr: 29,
  };
}

function getCol(cols: string[], index: number): string {
  if (index < 0 || index >= cols.length) return '';
  return cols[index] || '';
}

// ─── Format B: "Por Produto" (Product-level, ~25 cols) ───

function isProductFormat(lines: string[]): boolean {
  // Product format has metadata in first rows and "Consulta de pesquisa" or specific structure
  // Also detectable by having product info in early rows
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('nome do produto') || lower.includes('id do produto') || lower.includes('consulta de pesquisa')) {
      return true;
    }
  }
  return false;
}

function parseProductFormatCSV(csvContent: string): ParsedAdsFile | null {
  try {
    const lines = csvContent.split('\n').map(l => l.replace(/^\uFEFF/, '').trim()).filter(l => l.length > 0);
    if (lines.length < 8) return null;

    let shopName = '';
    let productName = '';
    let productId = '';
    let periodStr = '';

    // Extract metadata from header rows
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const cols = parseCSVLine(lines[i]);
      const label = (cols[0] || '').toLowerCase().trim();
      if (label.includes('nome da loja') || label.includes('loja')) shopName = cols[1] || '';
      if (label.includes('nome do produto')) productName = cols[1] || '';
      if (label.includes('id do produto')) productId = cols[1] || '';
      if (label.includes('período') || label.includes('periodo')) periodStr = cols[1] || '';
    }

    // Find header row
    const headerIndex = lines.findIndex(l => l.startsWith('#,') || l.toLowerCase().includes('consulta de pesquisa'));
    if (headerIndex === -1) return null;

    const headerCols = parseCSVLine(lines[headerIndex]);
    
    // Determine column positions for product format
    // Typically: #, Keyword/Query, Match, Status, Bid, Position, Impressions, Clicks, CTR, Conv, DirectConv, ConvRate, ACOS, DirectACOS, CostPerConv, ItemsSold, DirectItemsSold, GMV, DirectRev, Spend, ROAS, DirectROAS, AvgPosition
    const posCol = headerCols.findIndex(h => {
      const hl = h.toLowerCase().trim();
      return hl.includes('posição') || hl.includes('posicao') || hl.includes('position');
    });

    // Aggregate all data rows into one metric for this product
    let totalImpressions = 0, totalClicks = 0, totalConversions = 0;
    let totalItemsSold = 0, totalGmv = 0, totalSpend = 0;
    let totalDirectItemsSold = 0, totalDirectRevenue = 0;
    let positionSum = 0, positionCount = 0;
    let dataRowCount = 0;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 10) continue;
      const idx = parseInt(cols[0]) || 0;
      if (idx === 0) continue;
      dataRowCount++;

      // Column positions depend on format. Common product format:
      // Impressions at ~6, Clicks at ~7, etc.
      // We'll use relative positions based on header length
      const numCols = headerCols.length;
      let impIdx: number, clickIdx: number, itemsSoldIdx: number, gmvIdx: number, spendIdx: number, roasIdx: number;

      if (numCols >= 23) {
        // Full product format
        impIdx = 6; clickIdx = 7; itemsSoldIdx = 15; gmvIdx = 17; spendIdx = 19; roasIdx = 20;
      } else {
        // Shorter format - estimate positions
        impIdx = 6; clickIdx = 7; itemsSoldIdx = 13; gmvIdx = 15; spendIdx = 17; roasIdx = 18;
      }

      totalImpressions += parseBRNumber(getCol(cols, impIdx));
      totalClicks += parseBRNumber(getCol(cols, clickIdx));
      totalItemsSold += parseBRNumber(getCol(cols, itemsSoldIdx));
      totalGmv += parseBRNumber(getCol(cols, gmvIdx));
      totalSpend += parseBRNumber(getCol(cols, spendIdx));

      if (posCol >= 0) {
        const posVal = parseBRNumber(getCol(cols, posCol));
        if (posVal > 0) { positionSum += posVal; positionCount++; }
      }
    }

    if (dataRowCount === 0) return null;

    const period = parsePeriod(periodStr);
    const roas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const acos = totalGmv > 0 ? (totalSpend / totalGmv) * 100 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const costPerConv = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgPos = positionCount > 0 ? Math.round(positionSum / positionCount) : null;

    const metric: ParsedAdMetric = {
      shopeeProductId: productId,
      shopeeProductName: productName,
      periodStart: period.start,
      periodEnd: period.end,
      impressions: totalImpressions,
      clicks: totalClicks,
      itemsSold: totalItemsSold,
      gmv: totalGmv,
      spend: totalSpend,
      roas: parseFloat(roas.toFixed(2)),
      acos: parseFloat(acos.toFixed(2)),
      avgPosition: avgPos,
      ctr: parseFloat(ctr.toFixed(2)),
      convRate: parseFloat(convRate.toFixed(2)),
      directRoas: 0,
      directAcos: 0,
      costPerConv: parseFloat(costPerConv.toFixed(2)),
    };

    return {
      format: 'product',
      shopName,
      period: periodStr,
      metrics: [metric],
    };
  } catch {
    return null;
  }
}

// ─── Format A parser (general) ───

function parseGeneralFormatCSV(csvContent: string): ParsedAdsFile | null {
  try {
    const lines = csvContent.split('\n').map(l => l.replace(/^\uFEFF/, '').trim()).filter(l => l.length > 0);
    if (lines.length < 8) return null;

    const shopName = lines[2]?.split(',')[1] || '';
    const periodStr = lines[5]?.split(',')[1] || '';

    const headerIndex = lines.findIndex(l => l.startsWith('#,'));
    if (headerIndex === -1) return null;

    const headerCols = parseCSVLine(lines[headerIndex]);
    const map = detectGeneralColumnMap(headerCols);
    const period = parsePeriod(periodStr);

    // Group by productId
    const productMap = new Map<string, {
      name: string; id: string;
      impressions: number; clicks: number; itemsSold: number;
      gmv: number; spend: number; directRevenue: number;
      conversions: number; directConversions: number;
      directItemsSold: number;
    }>();

    const rawAds: ShopeeAdRow[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 20) continue;
      const index = parseInt(cols[0]) || 0;
      if (index === 0) continue;

      const spend = parseBRNumber(getCol(cols, map.spend));
      const gmv = parseBRNumber(getCol(cols, map.gmv));
      const liquidReturn = gmv - spend;
      const roi = spend > 0 ? ((gmv - spend) / spend) * 100 : 0;
      const rentability = gmv > 0 ? ((gmv - spend) / gmv) * 100 : 0;
      const clicks = parseBRNumber(getCol(cols, map.clicks));
      const impressions = parseBRNumber(getCol(cols, map.impressions));
      const itemsSold = parseBRNumber(getCol(cols, map.itemsSold));
      const roas = parseBRNumber(getCol(cols, map.roas));
      const acos = parseBRNumber(getCol(cols, map.acos));
      const ctr = parseBRNumber(getCol(cols, map.ctr));
      const convRate = parseBRNumber(getCol(cols, map.conversionRate));
      const productIdVal = getCol(cols, map.productId) || '-';
      const adName = getCol(cols, map.adName);

      const ad: ShopeeAdRow = {
        index, adName,
        status: getCol(cols, map.status),
        adType: getCol(cols, map.adType),
        productId: productIdVal,
        bidMethod: getCol(cols, map.bidMethod),
        positioning: getCol(cols, map.positioning),
        keyword: map.keyword >= 0 ? getCol(cols, map.keyword) : '',
        matchType: map.matchType >= 0 ? getCol(cols, map.matchType) : '',
        impressions, clicks, ctr,
        conversions: parseBRNumber(getCol(cols, map.conversions)),
        directConversions: parseBRNumber(getCol(cols, map.directConversions)),
        conversionRate: convRate,
        acos, directAcos: parseBRNumber(getCol(cols, map.directAcos)),
        costPerConv: parseBRNumber(getCol(cols, map.costPerConversion)),
        itemsSold,
        directItemsSold: parseBRNumber(getCol(cols, map.directItemsSold)),
        gmv, directRevenue: parseBRNumber(getCol(cols, map.directRevenue)),
        spend, roas, directRoas: parseBRNumber(getCol(cols, map.directRoas)),
        productImpressions: parseBRNumber(getCol(cols, map.productImpressions)),
        productClicks: parseBRNumber(getCol(cols, map.productClicks)),
        productCtr: parseBRNumber(getCol(cols, map.productCtr)),
        liquidReturn, roi, rentability,
        shopeeProductId: productIdVal,
        shopeeProductName: adName,
        periodStart: period.start,
        periodEnd: period.end,
        avgPosition: null,
        convRate, cpc: clicks > 0 ? spend / clicks : 0,
        costPerSale: itemsSold > 0 ? spend / itemsSold : 0,
      };

      rawAds.push(ad);

      // Aggregate per product
      const key = productIdVal !== '-' ? productIdVal : `name:${adName}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.itemsSold += itemsSold;
        existing.gmv += gmv;
        existing.spend += spend;
        existing.conversions += ad.conversions;
        existing.directConversions += ad.directConversions;
        existing.directItemsSold += ad.directItemsSold;
        existing.directRevenue += ad.directRevenue;
      } else {
        productMap.set(key, {
          name: adName, id: productIdVal,
          impressions, clicks, itemsSold, gmv, spend,
          conversions: ad.conversions, directConversions: ad.directConversions,
          directItemsSold: ad.directItemsSold, directRevenue: ad.directRevenue,
        });
      }
    }

    // Build metrics from aggregated products
    const metrics: ParsedAdMetric[] = [];
    for (const [, data] of productMap) {
      const roas = data.spend > 0 ? data.gmv / data.spend : 0;
      const acos = data.gmv > 0 ? (data.spend / data.gmv) * 100 : 0;
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const convRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
      const costPerConv = data.conversions > 0 ? data.spend / data.conversions : 0;
      const directRoas = data.spend > 0 ? data.directRevenue / data.spend : 0;
      const directAcos = data.directRevenue > 0 ? (data.spend / data.directRevenue) * 100 : 0;

      metrics.push({
        shopeeProductId: data.id,
        shopeeProductName: data.name,
        periodStart: period.start,
        periodEnd: period.end,
        impressions: data.impressions,
        clicks: data.clicks,
        itemsSold: data.itemsSold,
        gmv: data.gmv,
        spend: data.spend,
        roas: parseFloat(roas.toFixed(2)),
        acos: parseFloat(acos.toFixed(2)),
        avgPosition: null,
        ctr: parseFloat(ctr.toFixed(2)),
        convRate: parseFloat(convRate.toFixed(2)),
        directRoas: parseFloat(directRoas.toFixed(2)),
        directAcos: parseFloat(directAcos.toFixed(2)),
        costPerConv: parseFloat(costPerConv.toFixed(2)),
      });
    }

    return {
      format: 'general',
      shopName,
      period: periodStr,
      metrics,
    };
  } catch {
    return null;
  }
}

// ─── Main Parse Function ───

export function parseShopeeAdsCSV(csvContent: string): ParsedAdsFile | null {
  if (isProductFormat(csvContent.split('\n'))) {
    return parseProductFormatCSV(csvContent);
  }
  return parseGeneralFormatCSV(csvContent);
}

// Legacy function for backward compatibility
export function parseShopeeCSV(csvContent: string): ShopeeAdsReport | null {
  try {
    const lines = csvContent.split('\n').map(l => l.replace(/^\uFEFF/, '').trim()).filter(l => l.length > 0);
    if (lines.length < 8) return null;

    const shopName = lines[2]?.split(',')[1] || '';
    const storeId = lines[3]?.split(',')[1] || '';
    const createdAt = lines[4]?.split(',')[1] || '';
    const period = lines[5]?.split(',')[1] || '';

    const headerIndex = lines.findIndex(l => l.startsWith('#,'));
    if (headerIndex === -1) return null;

    const headerCols = parseCSVLine(lines[headerIndex]);
    const map = detectGeneralColumnMap(headerCols);

    const ads: ShopeeAdRow[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 20) continue;
      const index = parseInt(cols[0]) || 0;
      if (index === 0) continue;

      const spend = parseBRNumber(getCol(cols, map.spend));
      const gmv = parseBRNumber(getCol(cols, map.gmv));
      const clicks = parseBRNumber(getCol(cols, map.clicks));
      const itemsSold = parseBRNumber(getCol(cols, map.itemsSold));
      const liquidReturn = gmv - spend;
      const roi = spend > 0 ? ((gmv - spend) / spend) * 100 : 0;
      const rentability = gmv > 0 ? ((gmv - spend) / gmv) * 100 : 0;

      ads.push({
        index,
        adName: getCol(cols, map.adName),
        status: getCol(cols, map.status),
        adType: getCol(cols, map.adType),
        productId: getCol(cols, map.productId) || '-',
        bidMethod: getCol(cols, map.bidMethod),
        positioning: getCol(cols, map.positioning),
        keyword: map.keyword >= 0 ? getCol(cols, map.keyword) : '',
        matchType: map.matchType >= 0 ? getCol(cols, map.matchType) : '',
        impressions: parseBRNumber(getCol(cols, map.impressions)),
        clicks,
        ctr: parseBRNumber(getCol(cols, map.ctr)),
        conversions: parseBRNumber(getCol(cols, map.conversions)),
        directConversions: parseBRNumber(getCol(cols, map.directConversions)),
        conversionRate: parseBRNumber(getCol(cols, map.conversionRate)),
        acos: parseBRNumber(getCol(cols, map.acos)),
        directAcos: parseBRNumber(getCol(cols, map.directAcos)),
        costPerConv: parseBRNumber(getCol(cols, map.costPerConversion)),
        itemsSold,
        directItemsSold: parseBRNumber(getCol(cols, map.directItemsSold)),
        gmv,
        directRevenue: parseBRNumber(getCol(cols, map.directRevenue)),
        spend,
        roas: parseBRNumber(getCol(cols, map.roas)),
        directRoas: parseBRNumber(getCol(cols, map.directRoas)),
        productImpressions: parseBRNumber(getCol(cols, map.productImpressions)),
        productClicks: parseBRNumber(getCol(cols, map.productClicks)),
        productCtr: parseBRNumber(getCol(cols, map.productCtr)),
        liquidReturn, roi, rentability,
        shopeeProductId: getCol(cols, map.productId) || '-',
        shopeeProductName: getCol(cols, map.adName),
        periodStart: '', periodEnd: '',
        avgPosition: null,
        convRate: parseBRNumber(getCol(cols, map.conversionRate)),
        cpc: clicks > 0 ? spend / clicks : 0,
        costPerSale: itemsSold > 0 ? spend / itemsSold : 0,
      });
    }

    const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
    const totalGmv = ads.reduce((s, a) => s + a.gmv, 0);
    const totalItemsSold = ads.reduce((s, a) => s + a.itemsSold, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const avgAcos = totalGmv > 0 ? (totalSpend / totalGmv) * 100 : 0;
    const totalLiquidReturn = totalGmv - totalSpend;
    const avgRoi = totalSpend > 0 ? ((totalGmv - totalSpend) / totalSpend) * 100 : 0;

    return {
      shopName, storeId, period, createdAt, ads,
      totals: { totalSpend, totalGmv, totalItemsSold, avgRoas, avgAcos, totalLiquidReturn, avgRoi },
    };
  } catch {
    return null;
  }
}
