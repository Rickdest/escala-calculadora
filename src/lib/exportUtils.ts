import { Product, ProductCalculation, Store, StoreConfig } from '@/types/store';

interface ExportData {
  product: Product;
  calc: ProductCalculation;
}

export function exportToCSV(data: ExportData[], storeName: string): void {
  const headers = [
    'Produto',
    'Custo',
    'Preço de Venda',
    'Embalagem',
    'Ads',
    'Estoque',
    'Taxa Shopee',
    'Impostos',
    'Comissão Afiliados',
    'Campanhas',
    'Lucro Líquido',
    'Margem Real %',
  ];

  const rows = data.map(({ product, calc }) => [
    product.name,
    product.costPrice.toFixed(2),
    product.salePrice.toFixed(2),
    product.packagingCost.toFixed(2),
    product.adsCost.toFixed(2),
    product.stockQuantity,
    calc.totalShopeeFee.toFixed(2),
    calc.taxes.toFixed(2),
    calc.affiliateCommission.toFixed(2),
    calc.shopeeCampaigns.toFixed(2),
    calc.netProfit.toFixed(2),
    calc.realMargin.toFixed(1),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${storeName}_produtos_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generatePDFContent(data: ExportData[], store: Store): string {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalProfit = data.reduce((sum, { calc }) => sum + calc.netProfit, 0);
  const avgMargin = data.length > 0 
    ? data.reduce((sum, { calc }) => sum + calc.realMargin, 0) / data.length 
    : 0;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório - ${store.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #7c3aed; }
        .summary-label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #7c3aed; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .positive { color: #22c55e; }
        .negative { color: #ef4444; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>Relatório de Produtos - ${store.name}</h1>
      
      <div class="summary">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${data.length}</div>
            <div class="summary-label">Produtos</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(totalProfit)}</div>
            <div class="summary-label">Lucro Total</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${avgMargin.toFixed(1)}%</div>
            <div class="summary-label">Margem Média</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${store.config.desiredMargin}%</div>
            <div class="summary-label">Meta</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Custo</th>
            <th>Venda</th>
            <th>Lucro</th>
            <th>Margem</th>
            <th>Estoque</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(({ product, calc }) => {
    const marginClass = calc.isAboveTarget ? 'positive' : 'negative';
    html += `
      <tr>
        <td>${product.name}</td>
        <td>${formatCurrency(product.costPrice)}</td>
        <td>${formatCurrency(product.salePrice)}</td>
        <td class="${calc.netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(calc.netProfit)}</td>
        <td class="${marginClass}">${calc.realMargin.toFixed(1)}%</td>
        <td>${product.stockQuantity}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      
      <div class="footer">
        Gerado em ${new Date().toLocaleString('pt-BR')} | Escala Calculadora
      </div>
    </body>
    </html>
  `;

  return html;
}

export function exportToPDF(data: ExportData[], store: Store): void {
  const htmlContent = generatePDFContent(data, store);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
