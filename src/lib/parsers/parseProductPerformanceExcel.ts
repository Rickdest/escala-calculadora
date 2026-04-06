export interface ProductPerformanceRow {
  item_id: string;
  nome: string;
  vendas_pago: number;
  pedidos_pagos: number;
  unidades_pagas: number;
  compradores_pagos: number;
  ticket_medio: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  taxa_conversao: number;
  taxa_rejeicao: number;
  add_carrinho: number;
  taxa_carrinho: number;
  taxa_recompra: number;
  variacoes: ProductVariacao[];
}

export interface ProductVariacao {
  variacao_id: string;
  nome_variacao: string;
  vendas_pago: number;
  unidades_pagas: number;
  compradores_pagos: number;
}

function parseBRL(val: any): number {
  if (!val || val === '-') return 0;
  return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
}

function parsePct(val: any): number {
  if (!val || val === '-') return 0;
  return parseFloat(String(val).replace('%', '').replace(',', '.')) || 0;
}

function parseInt2(val: any): number {
  if (!val || val === '-') return 0;
  return parseInt(String(val).replace(/\./g, ''), 10) || 0;
}

export async function parseProductPerformanceExcel(
  file: File
): Promise<{ products: ProductPerformanceRow[]; period_start: string; period_end: string }> {
  // Extrair período do nome: parentskudetail.YYYYMMDD_YYYYMMDD.xlsx ou parentskudetail_YYYYMMDD_YYYYMMDD.xlsx
  const match = file.name.match(/(\d{8})[_.](\d{8})/);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const period_start = match ? match[1] : today;
  const period_end = match ? match[2] : today;

  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = read(buffer);

  let ws = wb.Sheets['Produtos com Melhor Desempenho'];
  if (!ws) {
    // Fallback: use first available sheet
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) throw new Error('Nenhuma aba encontrada no arquivo');
    ws = wb.Sheets[firstSheetName];
    if (!ws) throw new Error('Aba vazia no arquivo');
  }

  const rows: any[][] = utils.sheet_to_json(ws, { header: 1, defval: '-' });
  const dataRows = rows.slice(1);

  const products: ProductPerformanceRow[] = [];
  let currentProduct: ProductPerformanceRow | null = null;

  for (const row of dataRows) {
    if (!row[0] || row[0] === '-') continue;

    const isVariacao = row[3] !== '-' && row[3] !== null && row[3] !== undefined && String(row[3]).trim() !== '';

    if (!isVariacao) {
      if (currentProduct) products.push(currentProduct);
      currentProduct = {
        item_id: String(row[0]),
        nome: String(row[1]),
        vendas_pago: parseBRL(row[9]),
        pedidos_pagos: parseInt2(row[16]),
        unidades_pagas: parseInt2(row[18]),
        compradores_pagos: parseInt2(row[20]),
        ticket_medio: parseBRL(row[24]),
        impressoes: parseInt2(row[10]),
        cliques: parseInt2(row[11]),
        ctr: parsePct(row[12]),
        taxa_conversao: parsePct(row[14]),
        taxa_rejeicao: parsePct(row[30]),
        add_carrinho: parseInt2(row[34]),
        taxa_carrinho: parsePct(row[35]),
        taxa_recompra: parsePct(row[37]),
        variacoes: [],
      };
    } else if (currentProduct) {
      currentProduct.variacoes.push({
        variacao_id: String(row[3]),
        nome_variacao: String(row[4]),
        vendas_pago: parseBRL(row[9]),
        unidades_pagas: parseInt2(row[18]),
        compradores_pagos: parseInt2(row[20]),
      });
    }
  }

  if (currentProduct) products.push(currentProduct);

  return { products, period_start, period_end };
}
