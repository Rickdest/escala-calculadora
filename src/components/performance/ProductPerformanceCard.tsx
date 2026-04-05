import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Star, TrendingUp, ShoppingCart, Eye, MousePointerClick, Megaphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FunnelBar } from './FunnelBar';
import { InsightsPanel } from './InsightsPanel';
import { calcOrganicoVsAds } from '@/lib/calcPerformance';
import type { ProductPerformanceDB } from '@/hooks/useProductPerformance';

interface Props {
  produto: ProductPerformanceDB;
  rank: number;
  periodDays: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-foreground font-mono mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ProductPerformanceCard({ produto, rank, periodDays }: Props) {
  const [open, setOpen] = useState(false);
  const unDia = periodDays > 0 ? produto.unidades_pagas / periodDays : 0;
  const isAdsOnly = produto.source === 'ads_api';
  const hasOrganic = produto.impressoes > 0 || produto.ctr > 0 || produto.taxa_conversao > 0;
  const split = calcOrganicoVsAds(produto.vendas_pago, produto.ads_gmv);
  const sortedVariacoes = [...produto.variacoes].sort((a, b) => b.vendas_pago - a.vendas_pago);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border overflow-hidden hover:bg-muted/20 transition-colors">
        <CollapsibleTrigger className="w-full text-left p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {rank < 3 ? (
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">{MEDALS[rank]}</span>
              ) : (
                <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">{rank + 1}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{produto.nome}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-mono">ID: {produto.item_id}</span>
                  {isAdsOnly && (
                    <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-primary/30 text-primary px-1">
                      <Megaphone className="w-2.5 h-2.5" />Dados via Ads
                    </Badge>
                  )}
                  {produto.ads_roas != null && produto.ads_roas > 0 && (
                    <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-primary/30 text-primary px-1">
                      <TrendingUp className="w-2.5 h-2.5" />ROAS {produto.ads_roas.toFixed(1)}x
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-bold text-foreground">
                  R$ {produto.vendas_pago.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-muted-foreground">{produto.unidades_pagas} un.</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-3 pb-4 pt-3 space-y-4 animate-fade-up">
            {/* Metrics Grid */}
            {isAdsOnly ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MetricBox label="GMV Ads" value={`R$ ${(produto.ads_gmv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
                <MetricBox label="Gasto Ads" value={`R$ ${(produto.ads_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <MetricBox label="ROAS" value={`${(produto.ads_roas || 0).toFixed(1)}x`} />
                <MetricBox label="Pedidos Ads" value={String(produto.ads_pedidos || 0)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MetricBox label="Receita" value={`R$ ${produto.vendas_pago.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
                <MetricBox label="Pedidos pagos" value={String(produto.pedidos_pagos)} />
                <MetricBox label="Ticket médio" value={`R$ ${produto.ticket_medio.toFixed(2)}`} />
                <MetricBox label="Unid/dia" value={unDia.toFixed(1)} />
              </div>
            )}

            {/* Ads detail row for ads-only */}
            {isAdsOnly && (produto.ads_impressoes || 0) > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <MetricBox label="Impressões Ads" value={(produto.ads_impressoes || 0).toLocaleString('pt-BR')} />
                <MetricBox label="Cliques Ads" value={(produto.ads_cliques || 0).toLocaleString('pt-BR')} />
              </div>
            )}

            {/* Funnel — only when organic data exists */}
            {hasOrganic && produto.impressoes > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Funil de conversão</p>
                </div>
                <FunnelBar label="Impressões" value={produto.impressoes} max={produto.impressoes} />
                <FunnelBar label="Cliques" value={produto.cliques} max={produto.impressoes} pct={produto.ctr} pctLabel="CTR" />
                <FunnelBar label="Add ao carrinho" value={produto.add_carrinho} max={produto.impressoes} pct={produto.taxa_carrinho} />
                <FunnelBar label="Pedido pago" value={produto.pedidos_pagos} max={produto.impressoes} pct={produto.taxa_conversao} pctLabel="Conv." color="green" />
              </div>
            )}

            {/* Orgânico vs Ads Split — only when both exist */}
            {!isAdsOnly && produto.ads_gmv != null && produto.ads_gmv > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Orgânico vs Ads</p>
                <div className="h-3 rounded-full overflow-hidden bg-muted flex">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${split.pct_organico}%` }} />
                  <div className="h-full bg-primary transition-all" style={{ width: `${split.pct_ads}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span className="text-emerald-500 font-semibold">
                    🌱 Orgânico {split.pct_organico.toFixed(0)}% · R$ {split.organico_receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-primary font-semibold">
                    📈 Ads {split.pct_ads.toFixed(0)}% · R$ {split.ads_receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}

            {/* Info banner for ads-only */}
            {isAdsOnly && (
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Dados parciais.</strong> Estes são apenas dados de Ads. Importe o relatório de produto do Seller Center para ver o funil completo (impressões orgânicas, CTR, conversão, variações).
                </p>
              </div>
            )}

            {/* Variações */}
            {sortedVariacoes.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Variações ({sortedVariacoes.length})
                </p>
                <div className="space-y-1.5">
                  {sortedVariacoes.map((v, i) => {
                    const isTop = i === 0 && sortedVariacoes.length > 1;
                    const pct = produto.unidades_pagas > 0 ? (v.unidades_pagas / produto.unidades_pagas) * 100 : 0;
                    return (
                      <div key={v.variacao_id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 text-center shrink-0">
                          {isTop ? <Star className="w-3.5 h-3.5 text-amber-500 inline" /> : <span className="text-muted-foreground">{i + 1}</span>}
                        </span>
                        <span className="flex-1 truncate text-foreground">{v.nome_variacao}</span>
                        <span className="text-muted-foreground shrink-0">{v.unidades_pagas} un</span>
                        <span className="font-semibold text-primary shrink-0 w-20 text-right">
                          R$ {v.vendas_pago.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-primary font-mono shrink-0 w-10 text-right">{pct.toFixed(0)}%</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {produto.taxa_rejeicao > 0 && (
                <Badge variant="outline" className={`text-[10px] gap-1 ${produto.taxa_rejeicao > 30 ? 'border-destructive text-destructive' : ''}`}>
                  <MousePointerClick className="w-3 h-3" />
                  Rejeição {produto.taxa_rejeicao.toFixed(1)}%
                </Badge>
              )}
              {produto.taxa_recompra > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-500">
                  <ShoppingCart className="w-3 h-3" />
                  Recompra {produto.taxa_recompra.toFixed(1)}%
                </Badge>
              )}
            </div>

            {/* Insights — only when organic data */}
            {!isAdsOnly && <InsightsPanel produto={produto} />}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
