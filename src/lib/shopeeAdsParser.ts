// ─── Security Helpers ───

export interface CSVValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCSVSecurity(file: File, csvText: string): CSVValidationResult {
  // 1. Max file size: 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Arquivo muito grande. Máximo 5MB.' };
  }
  // 2. File extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'Apenas arquivos .csv são aceitos.' };
  }
  // 3. Max logical lines: 502 (merging multi-line quoted fields)
  const logicalLines = mergeMultiLineQuotedFields(csvText.split('\n'));
  if (logicalLines.length > 502) {
    return { valid: false, error: 'CSV com muitas linhas. Máximo 500 produtos.' };
  }
  // 4. XSS check on raw content (no per-field length - operation logs have large quoted fields)
  if (/<script/i.test(csvText) || /javascript:/i.test(csvText)) {
    return { valid: false, error: 'Conteúdo suspeito detectado.' };
  }
  return { valid: true };
}

export function sanitizeString(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function validateNumeric(value: number, fieldType: 'counter' | 'monetary' | 'percentage' | 'default' = 'default'): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  switch (fieldType) {
    case 'counter':
      return Math.max(0, Math.floor(value));
    case 'monetary':
      if (value > 99999999) return 0;
      return Math.max(0, Number(value.toFixed(2)));
    case 'percentage':
      return Math.max(0, Math.min(100, Number(value.toFixed(2))));
    default:
      return value;
  }
}

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
  // Extra fields
  status?: string;
  bidMethod?: string;
  conversions?: number;
  directConversions?: number;
  directGmv?: number;
  directItemsSold?: number;
  productImpressions?: number | null;
  productClicks?: number | null;
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


// ─── Helpers ───


function parseBRNumber(val: string): number {
  if (!val || val === '-' || val === '') return 0;
  const cleaned = val.replace(/\s/g, '').replace('%', '');
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
  const match = periodStr.match(/(\d{2}\/\d{2}\/\d{4})\s*[--]\s*(\d{2}\/\d{2}\/\d{4})/);
  if (match) {
    const [, s, e] = match;
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
      productImpressions: 30, productClicks: 31, productCtr: 32,
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
    productImpressions: 28, productClicks: 29, productCtr: 30,
  };
}

function getCol(cols: string[], index: number): string {
  if (index < 0 || index >= cols.length) return '';
  return cols[index] || '';
}

// ─── Format B: "Por Produto" (Product-level, ~25 cols) ───

function isProductFormat(lines: string[]): boolean {
  const normalizedLines = lines
    .slice(0, Math.min(15, lines.length))
    .map(line => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean);

  const reportTitle = (normalizedLines[0] || '').toLowerCase();
  if (reportTitle.includes('relatório de anúncios de produto') || reportTitle.includes('relatorio de anuncios de produto')) {
    return true;
  }

  const labels = normalizedLines.map(line => (parseCSVLine(line)[0] || '').toLowerCase().trim());
  const hasProductMetadata = labels.some(label =>
    label === 'nome do produto / anúncio'
    || label === 'nome do produto / anuncio'
    || label === 'id do produto'
  );

  const hasProductSearchHeader = normalizedLines.some(line => {
    const lower = line.toLowerCase();
    return lower.startsWith('#,') && lower.includes('consulta de pesquisa');
  });

  return hasProductMetadata || hasProductSearchHeader;
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

    // Fallback for empty product name
    if (!productName || productName.trim() === '') {
      productName = productId ? `Produto ${productId}` : 'Produto Desconhecido';
    }

    // Find header row
    const headerIndex = lines.findIndex(l => l.startsWith('#,') || l.toLowerCase().includes('consulta de pesquisa'));
    if (headerIndex === -1) return null;

    const headerCols = parseCSVLine(lines[headerIndex]);
    
    // Priority 1: exact match for "posicionamento médio" / "avg position" (NOT generic "posicionamento")
    const normalizeHeader = (h: string) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    let posCol = headerCols.findIndex(h => {
      const hl = normalizeHeader(h);
      return hl.includes('posicionamento medio') || hl.includes('posicionamento médio')
        || hl.includes('posicao media') || hl.includes('avg position')
        || hl.includes('media de posicao') || hl.includes('média de posição')
        || hl === 'posicao media' || hl === 'average position';
    });

    // Priority 2: fallback by column index 20 when CSV has 21+ columns
    if (posCol === -1 && headerCols.length >= 21) {
      const col20 = normalizeHeader(headerCols[20] || '');
      if (col20.includes('posi') || col20.includes('media') || col20.includes('medio')) {
        posCol = 20;
      }
    }

    // Aggregate all data rows into one metric for this product
    let totalImpressions = 0, totalClicks = 0, totalConversions = 0;
    let totalItemsSold = 0, totalGmv = 0, totalSpend = 0;
    let totalDirectItemsSold = 0, totalDirectRevenue = 0, totalDirectConversions = 0;
    let positionSum = 0, positionCount = 0;
    let dataRowCount = 0;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 10) continue;
      const idx = parseInt(cols[0]) || 0;
      if (idx === 0) continue;
      dataRowCount++;

      const numCols = headerCols.length;
      let impIdx: number, clickIdx: number, itemsSoldIdx: number, gmvIdx: number, spendIdx: number;
      let convIdx: number, directItemsSoldIdx: number, directRevenueIdx: number, directConvIdx: number;

      if (numCols >= 23) {
        // Full product format
        impIdx = 6; clickIdx = 7; convIdx = 9; directConvIdx = 10;
        itemsSoldIdx = 15; directItemsSoldIdx = 16;
        gmvIdx = 17; directRevenueIdx = 18; spendIdx = 19;
      } else {
        // Shorter format
        impIdx = 6; clickIdx = 7; convIdx = 9; directConvIdx = 10;
        itemsSoldIdx = 13; directItemsSoldIdx = 14;
        gmvIdx = 15; directRevenueIdx = 16; spendIdx = 17;
      }

      totalImpressions += parseBRNumber(getCol(cols, impIdx));
      totalClicks += parseBRNumber(getCol(cols, clickIdx));
      totalConversions += parseBRNumber(getCol(cols, convIdx));
      totalDirectConversions += parseBRNumber(getCol(cols, directConvIdx));
      totalItemsSold += parseBRNumber(getCol(cols, itemsSoldIdx));
      totalDirectItemsSold += parseBRNumber(getCol(cols, directItemsSoldIdx));
      totalGmv += parseBRNumber(getCol(cols, gmvIdx));
      totalDirectRevenue += parseBRNumber(getCol(cols, directRevenueIdx));
      totalSpend += parseBRNumber(getCol(cols, spendIdx));

      if (posCol >= 0) {
        const posVal = parseBRNumber(getCol(cols, posCol));
        if (posVal > 0) { positionSum += posVal; positionCount++; }
      }
    }

    if (dataRowCount === 0) return null;

    // Validate: conversions (orders) should never exceed items sold (units)
    if (totalConversions > totalItemsSold && totalItemsSold > 0) {
      const temp = totalConversions;
      totalConversions = totalItemsSold;
      totalItemsSold = temp;
    }
    if (totalDirectConversions > totalDirectItemsSold && totalDirectItemsSold > 0) {
      const temp = totalDirectConversions;
      totalDirectConversions = totalDirectItemsSold;
      totalDirectItemsSold = temp;
    }

    const period = parsePeriod(periodStr);
    const roas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const acos = totalGmv > 0 ? (totalSpend / totalGmv) * 100 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const costPerConv = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgPos = positionCount > 0 ? Math.round(positionSum / positionCount) : null;

    // For product CSV: if no direct fields found, use total as direct (product CSV = direct data)
    const effectiveDirectRevenue = totalDirectRevenue > 0 ? totalDirectRevenue : totalGmv;
    const effectiveDirectItemsSold = totalDirectItemsSold > 0 ? totalDirectItemsSold : totalItemsSold;
    const directRoas = totalSpend > 0 ? effectiveDirectRevenue / totalSpend : 0;
    const directAcos = effectiveDirectRevenue > 0 ? (totalSpend / effectiveDirectRevenue) * 100 : 0;

    const metric: ParsedAdMetric = {
      shopeeProductId: sanitizeString(productId),
      shopeeProductName: sanitizeString(productName),
      periodStart: period.start,
      periodEnd: period.end,
      impressions: validateNumeric(totalImpressions, 'counter'),
      clicks: validateNumeric(totalClicks, 'counter'),
      itemsSold: validateNumeric(totalItemsSold, 'counter'),
      gmv: validateNumeric(totalGmv, 'monetary'),
      spend: validateNumeric(totalSpend, 'monetary'),
      roas: validateNumeric(parseFloat(roas.toFixed(2))),
      acos: validateNumeric(parseFloat(acos.toFixed(2)), 'percentage'),
      avgPosition: avgPos,
      ctr: validateNumeric(parseFloat(ctr.toFixed(2)), 'percentage'),
      convRate: validateNumeric(parseFloat(convRate.toFixed(2)), 'percentage'),
      directRoas: validateNumeric(parseFloat(directRoas.toFixed(2))),
      directAcos: validateNumeric(parseFloat(directAcos.toFixed(2)), 'percentage'),
      costPerConv: validateNumeric(parseFloat(costPerConv.toFixed(2)), 'monetary'),
      conversions: validateNumeric(totalConversions, 'counter'),
      directConversions: validateNumeric(totalDirectConversions, 'counter'),
      directGmv: validateNumeric(effectiveDirectRevenue, 'monetary'),
      directItemsSold: validateNumeric(effectiveDirectItemsSold, 'counter'),
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
    const rawLines = csvContent.split('\n').map(l => l.replace(/^\uFEFF/, '').replace(/\r$/, ''));
    const lines = mergeMultiLineQuotedFields(rawLines).map(l => l.trim()).filter(l => l.length > 0);
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
      status: string; bidMethod: string;
      productImpressions: number; productClicks: number;
    }>();

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 20) continue;
      const index = parseInt(cols[0]) || 0;
      if (index === 0) continue;

      const spend = parseBRNumber(getCol(cols, map.spend));
      const gmv = parseBRNumber(getCol(cols, map.gmv));
      const clicks = parseBRNumber(getCol(cols, map.clicks));
      const impressions = parseBRNumber(getCol(cols, map.impressions));
      const itemsSold = parseBRNumber(getCol(cols, map.itemsSold));
      const productIdVal = getCol(cols, map.productId) || '-';
      const adName = getCol(cols, map.adName);

      const conversions = parseBRNumber(getCol(cols, map.conversions));
      const directConversions = parseBRNumber(getCol(cols, map.directConversions));
      const directItemsSold = parseBRNumber(getCol(cols, map.directItemsSold));
      const directRevenue = parseBRNumber(getCol(cols, map.directRevenue));
      const status = getCol(cols, map.status);
      const bidMethod = getCol(cols, map.bidMethod);
      const productImpressions = parseBRNumber(getCol(cols, map.productImpressions));
      const productClicks = parseBRNumber(getCol(cols, map.productClicks));

      // Aggregate per product
      const key = productIdVal !== '-' ? productIdVal : `name:${adName}`;
      // Note: validation for conversions > itemsSold happens after aggregation
      const existing = productMap.get(key);
      if (existing) {
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.itemsSold += itemsSold;
        existing.gmv += gmv;
        existing.spend += spend;
        existing.conversions += conversions;
        existing.directConversions += directConversions;
        existing.directItemsSold += directItemsSold;
        existing.directRevenue += directRevenue;
        existing.productImpressions += productImpressions;
        existing.productClicks += productClicks;
      } else {
        productMap.set(key, {
          name: adName, id: productIdVal,
          impressions, clicks, itemsSold, gmv, spend,
          conversions, directConversions,
          directItemsSold, directRevenue,
          status, bidMethod,
          productImpressions, productClicks,
        });
      }
    }

    // Build metrics from aggregated products
    const metrics: ParsedAdMetric[] = [];
    for (const [, data] of productMap) {
      // Validate: conversions (orders) should never exceed items sold (units)
      if (data.conversions > data.itemsSold && data.itemsSold > 0) {
        const temp = data.conversions;
        data.conversions = data.itemsSold;
        data.itemsSold = temp;
      }
      if (data.directConversions > data.directItemsSold && data.directItemsSold > 0) {
        const temp = data.directConversions;
        data.directConversions = data.directItemsSold;
        data.directItemsSold = temp;
      }
      const roas = data.spend > 0 ? data.gmv / data.spend : 0;
      const acos = data.gmv > 0 ? (data.spend / data.gmv) * 100 : 0;
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const convRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
      const costPerConv = data.conversions > 0 ? data.spend / data.conversions : 0;
      const directRoas = data.spend > 0 ? data.directRevenue / data.spend : 0;
      const directAcos = data.directRevenue > 0 ? (data.spend / data.directRevenue) * 100 : 0;

      metrics.push({
        shopeeProductId: sanitizeString(data.id),
        shopeeProductName: sanitizeString(data.name || `Produto ${data.id}`),
        periodStart: period.start,
        periodEnd: period.end,
        impressions: validateNumeric(data.impressions, 'counter'),
        clicks: validateNumeric(data.clicks, 'counter'),
        itemsSold: validateNumeric(data.itemsSold, 'counter'),
        gmv: validateNumeric(data.gmv, 'monetary'),
        spend: validateNumeric(data.spend, 'monetary'),
        roas: validateNumeric(parseFloat(roas.toFixed(2))),
        acos: validateNumeric(parseFloat(acos.toFixed(2)), 'percentage'),
        avgPosition: null,
        ctr: validateNumeric(parseFloat(ctr.toFixed(2)), 'percentage'),
        convRate: validateNumeric(parseFloat(convRate.toFixed(2)), 'percentage'),
        directRoas: validateNumeric(parseFloat(directRoas.toFixed(2))),
        directAcos: validateNumeric(parseFloat(directAcos.toFixed(2)), 'percentage'),
        costPerConv: validateNumeric(parseFloat(costPerConv.toFixed(2)), 'monetary'),
        status: sanitizeString(data.status),
        bidMethod: sanitizeString(data.bidMethod),
        conversions: validateNumeric(data.conversions, 'counter'),
        directConversions: validateNumeric(data.directConversions, 'counter'),
        directGmv: validateNumeric(data.directRevenue, 'monetary'),
        directItemsSold: validateNumeric(data.directItemsSold, 'counter'),
        productImpressions: data.productImpressions ? validateNumeric(data.productImpressions, 'counter') : null,
        productClicks: data.productClicks ? validateNumeric(data.productClicks, 'counter') : null,
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

// ─── Operation Log Types & Parser ───

export type OperationField = 'roas_target' | 'budget' | 'quick_boost' | 'campaign_created' | 'other';

export interface OperationLogEntry {
  timestamp: string;
  eventType: string;
  field: OperationField;
  details: string;
  fromValue?: string;
  toValue?: string;
  shopeeProductId?: string;
}

function mapEventToField(eventType: string, details: string): OperationField {
  const lower = eventType.toLowerCase();
  if (lower.includes('alterar roas de destino') || lower.includes('roas')) return 'roas_target';
  if (lower.includes('alterar orçamento') || lower.includes('orcamento') || lower.includes('budget')) return 'budget';
  if (lower.includes('create campaign') || lower.includes('criar campanha')) return 'campaign_created';
  if (details.toLowerCase().includes('impulsão') || details.toLowerCase().includes('impulsao') || lower.includes('boost')) return 'quick_boost';
  return 'other';
}

function extractFromTo(details: string): { fromValue?: string; toValue?: string } {
  const match = details.match(/:\s*([\d.,]+|Ilimitado|R\$[\d.,]+)\s*->\s*([\d.,]+|Ilimitado|R\$[\d.,]+)/);
  if (match) return { fromValue: match[1], toValue: match[2] };
  return {};
}

/**
 * Merge lines that are inside open quotes back into a single logical line.
 * Handles CSV fields that span multiple lines (e.g. "Create Campaign" details).
 */
function mergeMultiLineQuotedFields(rawLines: string[]): string[] {
  const merged: string[] = [];
  let buffer = '';
  let inQuote = false;

  for (const line of rawLines) {
    const cleanLine = line.replace(/\r$/, '');
    if (inQuote) {
      buffer += ' ' + cleanLine;
      // Count quotes - if odd total, we closed the quote
      const quoteCount = (cleanLine.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        inQuote = false;
        merged.push(buffer);
        buffer = '';
      }
    } else {
      const quoteCount = (cleanLine.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        // Odd quotes means a quote opened but didn't close on this line
        inQuote = true;
        buffer = cleanLine;
      } else {
        merged.push(cleanLine);
      }
    }
  }
  if (buffer) merged.push(buffer);
  return merged;
}

export function parseOperationLogCSV(csvContent: string): OperationLogEntry[] {
  try {
    const rawLines = csvContent.split('\n').map(l => l.replace(/^\uFEFF/, '').replace(/\r$/, ''));
    const lines = mergeMultiLineQuotedFields(rawLines).map(l => l.trim());
    const entries: OperationLogEntry[] = [];

    // Extract shopee product ID from metadata
    let shopeeProductId: string | undefined;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const cols = parseCSVLine(lines[i]);
      const label = (cols[0] || '').toLowerCase().trim();
      if (label.includes('id do produto')) {
        shopeeProductId = (cols[1] || '').trim();
        break;
      }
    }

    // Find header row: starts with "Atualizar horário"
    const headerIndex = lines.findIndex(l =>
      l.toLowerCase().startsWith('atualizar hor') || l.toLowerCase().startsWith('atualizar hora')
    );
    if (headerIndex === -1) return [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = parseCSVLine(line);
      if (cols.length < 4) continue;

      const rawTimestamp = cols[0]?.trim();
      if (!rawTimestamp) continue;

      // Accept both ISO (2026-04-03 13:40) and JS Date string (Fri Apr 03 2026...)
      let timestamp: string;
      if (/^\d{4}-\d{2}-\d{2}/.test(rawTimestamp)) {
        timestamp = rawTimestamp.replace(' ', 'T');
      } else {
        const parsed = new Date(rawTimestamp);
        if (isNaN(parsed.getTime())) continue;
        timestamp = parsed.toISOString();
      }
      const eventType = (cols[3] || '').trim();
      const details = (cols[4] || '').trim();

      const field = mapEventToField(eventType, details);
      const { fromValue, toValue } = extractFromTo(details);

      // For campaign_created, extract initial ROAS from multi-line details
      let campaignToValue = toValue;
      if (field === 'campaign_created' && !campaignToValue) {
        const roasMatch = details.match(/(?:Lance autom[áa]tico.*?|ROAS de destino:)\s*([\d.]+)/i);
        if (roasMatch) campaignToValue = roasMatch[1];
      }

      entries.push({
        timestamp,
        eventType: sanitizeString(eventType),
        field,
        details: sanitizeString(details),
        fromValue: fromValue ? sanitizeString(fromValue) : undefined,
        toValue: (campaignToValue || toValue) ? sanitizeString(campaignToValue || toValue || '') : undefined,
        shopeeProductId,
      });
    }

    return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch {
    return [];
  }
}

// ─── Auto-detect CSV format ───

export interface DetectedCSVResult {
  type: 'performance' | 'operation_log' | 'unknown';
  performanceData?: ParsedAdsFile;
  operationLog?: OperationLogEntry[];
}

export function detectAndParseCSV(content: string): DetectedCSVResult {
  const firstLines = content.slice(0, 500).toLowerCase();

  if (firstLines.includes('registro de opera')) {
    const log = parseOperationLogCSV(content);
    return { type: 'operation_log', operationLog: log };
  }

  if (firstLines.includes('relatório de anúncios') || firstLines.includes('relatorio de anuncios')
    || firstLines.includes('dados gerais de anúncios') || firstLines.includes('dados gerais de anuncios')) {
    const data = parseShopeeAdsCSV(content);
    return { type: 'performance', performanceData: data ?? undefined };
  }

  // Fallback: try parsing as performance anyway
  const fallback = parseShopeeAdsCSV(content);
  if (fallback && fallback.metrics.length > 0) {
    return { type: 'performance', performanceData: fallback };
  }

  return { type: 'unknown' };
}
