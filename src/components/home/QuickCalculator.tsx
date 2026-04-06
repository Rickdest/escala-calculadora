import { useState, useMemo } from 'react';
import { Zap, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice, DEFAULT_STORE_CONFIG } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { calcFullRoas } from '@/lib/roasUtils';
import { Badge } from '@/components/ui/badge';

interface QuickCalculatorProps {
  onSaveProduct: (prefill: {costPrice: string; salePrice: string; packaging: string;}) => void;
}

export function QuickCalculator({ onSaveProduct }: QuickCalculatorProps) {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const config = currentStore?.config;
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [monthlySales, setMonthlySales] = useState(1000);

  const hasGlobalTaxes = !!(
    config?.taxes && config.taxes > 0 ||
    config?.enableAffiliateCommission ||
    config?.enableShopeeCampaigns ||
    config?.shopeeAcelera && config.shopeeAcelera !== 'none' ||
    config?.isCpfSeller && config?.hasOver450Orders
  );

  const hasValidInputs = (parseFloat(salePrice) || 0) > 0 && (parseFloat(costPrice) || 0) > 0;

  const result = useMemo(() => {
    const sp = parseFloat(salePrice) || 0;
    const cp = parseFloat(costPrice) || 0;
    if (sp <= 0 || cp <= 0) return null;

    const activeConfig = config || DEFAULT_STORE_CONFIG;
    const packagingCost = parseFloat(packaging) || 0;

    const roasResult = calcFullRoas(sp, cp, activeConfig, packagingCost, 0, 0);

    const range = getShopeeFeeForPrice(sp);
    const shopeeFeePercent = sp * (range.percent / 100);
    const shopeeFeeFixed = range.fixed;
    const cpfExtra = roasResult.costs.cpfAdditional;
    const aceleraVal = activeConfig.shopeeAcelera || 'none';
    const aceleraPercent = aceleraVal === 'indicado' ? 2.5 : aceleraVal === 'nao_indicado' ? 3.5 : 0;

    return {
      netProfit: roasResult.lucroBruto,
      realMargin: sp > 0 ? (roasResult.lucroBruto / sp) * 100 : 0,
      cp,
      roasEmpate: roasResult.roasEmpate && roasResult.roasEmpate > 0 ? roasResult.roasEmpate : 0,
      roasSaudavel: roasResult.roasSaudavel && roasResult.roasSaudavel > 0 ? roasResult.roasSaudavel : 0,
      roasIdeal: roasResult.roasIdeal && roasResult.roasIdeal > 0 ? roasResult.roasIdeal : 0,
      totalShopeeFee: roasResult.costs.shopeeFee,
      shopeeFeePercent,
      shopeeFeeFixed,
      cpfExtra,
      packagingCost: roasResult.costs.packagingCost,
      taxesCost: roasResult.costs.taxes,
      taxesPercent: activeConfig.taxes || 0,
      affiliateCost: roasResult.costs.affiliateCommission,
      affiliatePercent: activeConfig.affiliateCommission || 0,
      campaignsCost: roasResult.costs.campaigns,
      campaignsPercent: activeConfig.shopeeCampaigns || 0,
      aceleraCost: roasResult.costs.acelera,
      aceleraPercent,
      totalCosts: roasResult.totalCosts,
      sp
    };
  }, [salePrice, costPrice, packaging, config]);

  const projection = useMemo(() => {
    if (!result) return null;
    return {
      revenue: result.sp * monthlySales,
      costs: result.totalCosts * monthlySales,
      profit: result.netProfit * monthlySales
    };
  }, [result, monthlySales]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="bg-card rounded-2xl p-4 animate-fade-up" style={{ border: '1px solid rgba(232, 93, 0, 0.30)', boxShadow: '0 0 20px rgba(232, 93, 0, 0.07)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CALCULADORA RÁPIDA</p>
        <Badge className="text-[10px] font-medium px-2.5 py-0.5 border-0 bg-primary text-primary-foreground rounded-[20px]">
          Shopee
        </Badge>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">CUSTO</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm border-r border-border pr-1.5">R$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0,00"
              className="w-full h-12 pl-10 pr-2 border border-border rounded-[10px] text-foreground font-mono font-mono-num text-base focus:border-primary focus:outline-none transition-colors bg-background"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">PREÇO DE VENDA</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm border-r border-border pr-1.5">R$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0,00"
              className="w-full h-12 pl-10 pr-2 border border-border rounded-[10px] text-foreground font-mono font-mono-num text-base focus:border-primary focus:outline-none transition-colors bg-background"
            />
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">EMBALAGEM (OPCIONAL)</label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm border-r border-border pr-1.5">R$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={packaging}
            onChange={(e) => setPackaging(e.target.value)}
            placeholder="0,00"
            className="w-full h-12 pl-10 pr-2 border border-border rounded-[10px] text-foreground font-mono font-mono-num text-base focus:border-primary focus:outline-none transition-colors bg-background"
          />
        </div>
      </div>

      {/* Resultados reativos */}
      {hasValidInputs && result && (
        <div className="animate-fade-up space-y-3">
          {/* 3 cards de métricas */}
          <div className="grid grid-cols-3 gap-2">
            {/* Margem real */}
            {(() => {
              const status = getMarginStatus(result.realMargin);
              return (
                <div className={cn(
                  'rounded-xl p-2.5 flex flex-col items-start border min-w-0',
                  status.bg, status.border
                )}>
                  <p className={cn('font-mono text-[18px] font-extrabold font-mono-num leading-tight truncate w-full', status.color)}>
                    {result.realMargin.toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mt-0.5">Margem real</p>
                </div>
              );
            })()}

            {/* Lucro líquido */}
            <div className={cn(
              'rounded-xl p-2.5 flex flex-col items-start border min-w-0',
              result.netProfit >= 0 ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'
            )}>
              <p className={cn(
                'font-mono text-[15px] font-extrabold font-mono-num leading-tight truncate w-full',
                result.netProfit >= 0 ? 'text-success' : 'text-danger'
              )}>
                {formatCurrency(result.netProfit)}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mt-0.5">Lucro líquido</p>
            </div>

            {/* ROAS Empate */}
            <div className="rounded-xl p-2.5 flex flex-col items-start border bg-warning/10 border-warning/20 min-w-0">
              <p className="font-mono text-[18px] font-extrabold font-mono-num leading-tight truncate w-full text-warning">
                {result.roasEmpate > 0 ? `${result.roasEmpate.toFixed(2)}x` : '—'}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mt-0.5">ROAS empate</p>
            </div>
          </div>

          {/* Alerta de prejuízo */}
          {result.netProfit < 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-danger/10 border border-danger/30 animate-fade-up">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-[12px] font-semibold text-danger">Preço de venda abaixo do custo total. Você está vendendo no prejuízo.</p>
            </div>
          )}

          {/* Botão salvar + link análise */}
          <button
            onClick={() => onSaveProduct({ costPrice, salePrice, packaging })}
            className="w-full h-12 text-primary-foreground font-semibold text-[15px] rounded-[10px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98] bg-primary hover:bg-primary/90"
          >
            <Zap className="w-4 h-4" />
            Salvar produto
          </button>

          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors py-1"
          >
            {showAnalysis ? (
              <>Fechar análise <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Ver análise completa <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>

          {/* ANÁLISE COMPLETA */}
          {showAnalysis && projection && (
            <div className="bg-surface-2 rounded-[10px] p-3 animate-fade-up space-y-0">
              {/* Custos */}
              <div className="pb-3">
                <p className="uppercase text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">Custos</p>
                <div className="space-y-1.5">
                  <CostRow label="Taxa Shopee" value={result.totalShopeeFee} format={formatCurrency} />
                  {result.packagingCost > 0 && <CostRow label="Embalagem e Insumos" value={result.packagingCost} format={formatCurrency} />}
                  {result.taxesCost > 0 && <CostRow label={`Impostos (${result.taxesPercent}%)`} value={result.taxesCost} format={formatCurrency} />}
                  {result.affiliateCost > 0 && <CostRow label={`Comissão Afiliados (${result.affiliatePercent}%)`} value={result.affiliateCost} format={formatCurrency} />}
                  {result.campaignsCost > 0 && <CostRow label={`Campanhas Destaque (${result.campaignsPercent}%)`} value={result.campaignsCost} format={formatCurrency} />}
                  {result.aceleraCost > 0 && <CostRow label={`Shopee Acelera (${result.aceleraPercent}%)`} value={result.aceleraCost} format={formatCurrency} />}
                  {result.cpfExtra > 0 && <CostRow label="Adicional CPF" value={result.cpfExtra} format={formatCurrency} />}
                  <div className="border-t border-border pt-1.5 mt-1.5">
                    <CostRow label="Total de custos" value={result.totalCosts} format={formatCurrency} bold />
                    <div className="mt-1.5" />
                    <CostRow label="Preço de venda" value={result.sp} format={formatCurrency} />
                  </div>
                </div>

                {!hasGlobalTaxes && (
                  <button
                    onClick={() => navigate('/settings')}
                    className="mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/15 shrink-0">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground flex-1 text-left">Configure impostos e taxas para cálculo mais preciso.</span>
                    <span className="text-xs text-primary font-semibold group-hover:underline shrink-0">Configurar →</span>
                  </button>
                )}
              </div>

              <div className="border-t border-border" />

              {/* ROAS */}
              <div className="py-3">
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-2">ROAS</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[13px] text-text-2">Empate</span>
                      <span className="text-[10px] text-text-3 ml-1.5">abaixo disso = prejuízo</span>
                    </div>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{result.roasEmpate > 0 ? result.roasEmpate.toFixed(2) : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[13px] text-text-2">Saudável</span>
                      <span className="text-[10px] text-text-3 ml-1.5">lucro consistente</span>
                    </div>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{result.roasSaudavel > 0 ? result.roasSaudavel.toFixed(2) : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[13px] text-text-2">Ideal</span>
                      <span className="text-[10px] text-text-3 ml-1.5">escalar com segurança</span>
                    </div>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-primary">{result.roasIdeal > 0 ? result.roasIdeal.toFixed(2) : '--'}</span>
                  </div>

                  {result.roasEmpate > 0 && result.roasIdeal > 0 && (
                    <div className="pt-3 px-0">
                      <div className="flex justify-between text-[10px] text-text-3 mb-1.5">
                        <span>Empate</span>
                        <span>Saudável</span>
                        <span>Ideal</span>
                      </div>
                      <div className="relative h-1 rounded-[4px] overflow-hidden" style={{ backgroundColor: '#1F2433' }}>
                        <div className="absolute inset-0 rounded-[4px]" style={{ background: 'linear-gradient(to right, #EF4444, #EAB308, #22C55E)' }} />
                      </div>
                      <div className="relative h-3 mt-[-6px]">
                        <div className="absolute top-0 left-0 w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444', transform: 'translateX(-50%)' }} />
                        <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: '#EAB308', transform: 'translateX(-50%)' }} />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: '#F97316', transform: 'translateX(50%)' }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="font-mono text-[10px] font-mono-num" style={{ color: '#EF4444' }}>{result.roasEmpate.toFixed(2)}</span>
                        <span className="font-mono text-[10px] font-mono-num" style={{ color: '#EAB308' }}>{result.roasSaudavel.toFixed(2)}</span>
                        <span className="font-mono text-[12px] font-bold font-mono-num" style={{ color: '#F97316' }}>{result.roasIdeal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Projeção Mensal */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider">Projeção mensal</p>
                  <span className="text-[10px] text-text-3">vendas/mês</span>
                </div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={() => setMonthlySales((prev) => Math.max(prev - 10, 10))}
                    className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center text-[18px] font-bold text-foreground active:scale-95 transition-transform"
                  >−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="10"
                    max="10000"
                    value={monthlySales}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 10;
                      setMonthlySales(Math.min(Math.max(v, 10), 10000));
                    }}
                    className="w-24 h-11 text-[16px] font-mono font-bold font-mono-num text-center bg-background border border-border rounded-xl text-foreground focus:border-accent focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => setMonthlySales((prev) => Math.min(prev + 10, 10000))}
                    className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center text-[18px] font-bold text-foreground active:scale-95 transition-transform"
                  >+</button>
                </div>
                <div className="space-y-2 bg-background/50 rounded-xl p-3 border border-border/30">
                  <CostRow label="Receita bruta" value={projection.revenue} format={formatCurrency} />
                  <CostRow label="Custos totais" value={projection.costs} format={formatCurrency} />
                  <div className="border-t border-border/40 pt-2 mt-1">
                    <div className="flex justify-between">
                      <span className="text-[13px] font-semibold text-foreground">Lucro mensal</span>
                      <span className={cn(
                        'font-mono text-[15px] font-extrabold font-mono-num',
                        projection.profit >= 0 ? 'text-success' : 'text-danger'
                      )}>{formatCurrency(projection.profit)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[13px] text-text-2">Status</span>
                    <span className={cn('text-[13px] font-semibold', getMarginStatus(result.realMargin).color)}>
                      {getMarginStatus(result.realMargin).emoji} {getMarginStatus(result.realMargin).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CostRow({ label, value, format, bold }: {label: string; value: number; format: (v: number) => string; bold?: boolean;}) {
  return (
    <div className="flex justify-between">
      <span className={cn('text-[13px] text-text-2', bold && 'font-semibold')}>{label}</span>
      <span className={cn('font-mono text-[14px] font-mono-num text-foreground', bold ? 'font-bold' : 'font-bold')}>{format(value)}</span>
    </div>
  );
}
