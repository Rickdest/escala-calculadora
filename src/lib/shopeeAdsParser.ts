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
  productImpressions: number;
  productClicks: number;
  productCtr: number;
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
  };
}

function parseNumber(val: string): number {
  if (!val || val === '-' || val === '') return 0;
  // Remove % and handle comma as decimal
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

    const ads: ShopeeAdRow[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 26) continue;

      const index = parseInt(cols[0]) || 0;
      if (index === 0) continue;

      ads.push({
        index,
        adName: cols[1] || '',
        status: cols[2] || '',
        adType: cols[3] || '',
        productId: cols[4] || '-',
        impressions: parseNumber(cols[12]),
        clicks: parseNumber(cols[13]),
        ctr: parseNumber(cols[14]),
        conversions: parseNumber(cols[15]),
        directConversions: parseNumber(cols[16]),
        itemsSold: parseNumber(cols[21]),
        directItemsSold: parseNumber(cols[22]),
        gmv: parseNumber(cols[23]),
        directRevenue: parseNumber(cols[24]),
        spend: parseNumber(cols[25]),
        roas: parseNumber(cols[26]),
        directRoas: parseNumber(cols[27]),
      });
    }

    const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
    const totalGmv = ads.reduce((s, a) => s + a.gmv, 0);
    const totalItemsSold = ads.reduce((s, a) => s + a.itemsSold, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;

    return {
      shopName,
      storeId,
      period,
      createdAt,
      ads,
      totals: { totalSpend, totalGmv, totalItemsSold, avgRoas },
    };
  } catch (e) {
    console.error('Error parsing Shopee CSV:', e);
    return null;
  }
}
