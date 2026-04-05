import type { ProductPerformanceDB } from '@/hooks/useProductPerformance';

interface Props {
  produto: ProductPerformanceDB;
}

export function InsightsPanel({ produto }: Props) {
  const insights: string[] = [];

  if (produto.impressoes > 10000 && produto.ctr < 2) {
    insights.push('CTR abaixo de 2% com muitas impressões — considere melhorar título e imagem principal');
  }

  if (produto.taxa_carrinho > 5 && produto.taxa_conversao < 1) {
    insights.push('Muitos adicionam ao carrinho mas poucos pagam — verifique o preço ou frete');
  }

  if (produto.taxa_rejeicao > 30) {
    insights.push(`Taxa de rejeição de ${produto.taxa_rejeicao.toFixed(1)}% — a página do produto não está convencendo`);
  }

  if (produto.taxa_recompra > 5) {
    insights.push(`${produto.taxa_recompra.toFixed(1)}% dos compradores voltaram — produto com bom potencial de fidelização`);
  }

  if (!produto.ads_gmv && produto.taxa_conversao > 1.5) {
    insights.push('Boa conversão orgânica — candidato para Shopee Ads (baixo risco)');
  }

  if (produto.ads_roas && produto.ads_roas > 10) {
    insights.push(`ROAS de Ads em ${produto.ads_roas.toFixed(1)}x — campanha muito eficiente`);
  }

  if (produto.ads_gmv && produto.ads_gmv > 0) {
    const organicoReceita = produto.vendas_pago - produto.ads_gmv;
    if (organicoReceita > 0) {
      insights.push(`R$ ${organicoReceita.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} veio de forma orgânica (sem custo de Ads)`);
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
      <p className="text-xs font-medium text-primary mb-2">💡 Insights</p>
      <ul className="space-y-1.5">
        {insights.map((insight, i) => (
          <li key={i} className="text-xs text-muted-foreground flex gap-2">
            <span className="text-primary flex-shrink-0">→</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
