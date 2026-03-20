export interface ShopeeAdRow {
  index: number;
  adName: string;
  status: string;
  adType: string;
  productId: string;
  positioning: string;
  keyword: string;
  matchType: string;
  bidMethod: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  directConversions: number;
  conversionRate: number;
  itemsSold: number;
  directItemsSold: number;
  gmv: number;
  directRevenue: number;
  spend: number;
  roas: number;
  directRoas: number;
  acos: number;
  directAcos: number;
  costPerConversion: number;
  productImpressions: number;
  productClicks: number;
  productCtr: number;
  // Derived fields
  liquidReturn: number;
  roi: number;
  rentability: number;
}

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

function parseNumber(val: string): number {
  if (!val || val === '-' || val === '') return 0;
  const cleaned = val.replace('%', '').replace(',', '.').trim();
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

// Column mapping for "Dados Gerais" (no keyword columns, ~31 cols)
// and "Palavra-chave" (with keyword columns, ~33 cols)
interface ColumnMap {
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

function detectColumnMap(headerCols: string[]): ColumnMap {
  // "Palavra-chave" format has keyword/match type columns (~33+ cols)
  // "Dados Gerais" format doesn't (~31 cols or fewer keyword cols)
  const colCount = headerCols.length;
  const hasKeyword = colCount >= 33;

  if (hasKeyword) {
    // Palavra-chave format (33 cols)
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

  // Dados Gerais format (~31 cols, no keyword/matchType)
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

export function parseShopeeCSV(csvContent: string): ShopeeAdsReport | null {
  try {
    const lines = csvContent.split('\n').map(l => l.replace(/^\uFEFF/, '').trim()).filter(l => l.length > 0);

    if (lines.length < 8) return null;

    // Parse header info
    const shopName = lines[2]?.split(',')[1] || '';
    const storeId = lines[3]?.split(',')[1] || '';
    const createdAt = lines[4]?.split(',')[1] || '';
    const period = lines[5]?.split(',')[1] || '';

    // Find the data header row (starts with #,)
    const headerIndex = lines.findIndex(l => l.startsWith('#,'));
    if (headerIndex === -1) return null;

    const headerCols = parseCSVLine(lines[headerIndex]);
    const map = detectColumnMap(headerCols);

    const ads: ShopeeAdRow[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 20) continue;

      const index = parseInt(cols[0]) || 0;
      if (index === 0) continue;

      const spend = parseNumber(getCol(cols, map.spend));
      const gmv = parseNumber(getCol(cols, map.gmv));
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
        impressions: parseNumber(getCol(cols, map.impressions)),
        clicks: parseNumber(getCol(cols, map.clicks)),
        ctr: parseNumber(getCol(cols, map.ctr)),
        conversions: parseNumber(getCol(cols, map.conversions)),
        directConversions: parseNumber(getCol(cols, map.directConversions)),
        conversionRate: parseNumber(getCol(cols, map.conversionRate)),
        acos: parseNumber(getCol(cols, map.acos)),
        directAcos: parseNumber(getCol(cols, map.directAcos)),
        costPerConversion: parseNumber(getCol(cols, map.costPerConversion)),
        itemsSold: parseNumber(getCol(cols, map.itemsSold)),
        directItemsSold: parseNumber(getCol(cols, map.directItemsSold)),
        gmv,
        directRevenue: parseNumber(getCol(cols, map.directRevenue)),
        spend,
        roas: parseNumber(getCol(cols, map.roas)),
        directRoas: parseNumber(getCol(cols, map.directRoas)),
        productImpressions: parseNumber(getCol(cols, map.productImpressions)),
        productClicks: parseNumber(getCol(cols, map.productClicks)),
        productCtr: parseNumber(getCol(cols, map.productCtr)),
        liquidReturn,
        roi,
        rentability,
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
      shopName,
      storeId,
      period,
      createdAt,
      ads,
      totals: { totalSpend, totalGmv, totalItemsSold, avgRoas, avgAcos, totalLiquidReturn, avgRoi },
    };
  } catch (e) {
    return null;
  }
}
