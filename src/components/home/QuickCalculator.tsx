import { useState, useMemo } from 'react';
import { Zap, Loader2, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice } from '@/types/store';
import { cn } from '@/lib/utils';

interface QuickCalculatorProps {
  onSaveProduct: (prefill: { costPrice: string; salePrice: string; packaging: string }) => void;
}

export function QuickCalculator({ onSaveProduct }: QuickCalculatorProps) {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const config = currentStore?.config;
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [monthlySales, setMonthlySales] = useState(1000);

  const hasGlobalTaxes = !!(
    (config?.taxes && config.taxes > 0) ||
    config?.enableAffiliateCommission ||
    config?.enableShopeeCampaigns ||
    (config?.shopeeAcelera && config.shopeeAcelera !== 'none') ||
    (config?.isCpfSeller && config?.hasOver450Orders)
  );

  const result = useMemo(() => {
    const sp = parseFloat(salePrice) || 0;
    const cp = parseFloat(costPrice) || 0;
    if (sp <= 0 || cp <= 0) return null;

    const range = getShopeeFeeForPrice(sp);
    const shopeeFeePercent = sp * (range.percent / 100);
    const shopeeFeeFixed = range.fixed;
    const cpfExtra = config?.isCpfSeller && config?.hasOver450Orders ? 3 : 0;
    const totalShopeeFee = shopeeFeePercent + shopeeFeeFixed + cpfExtra;
    const taxesCost = (config?.taxes || 0) > 0 ? sp * ((config?.taxes || 0) / 100) : 0;
    const affiliateCost = config?.enableAffiliateCommission ? sp * ((config?.affiliateCommission || 0) / 100) : 0;
    const campaignsCost = config?.enableShopeeCampaigns ? sp * ((config?.shopeeCampaigns || 0) / 100) : 0;
    const aceleraVal = config?.shopeeAcelera || 'none';
    const aceleraPercent = aceleraVal === 'indicado' ? 2.5 : aceleraVal === 'nao_indicado' ? 3.5 : 0;
    const aceleraCost = sp * (aceleraPercent / 100);

    const packagingCost = parseFloat(packaging) || 0;
    const totalCosts = cp + packagingCost + totalShopeeFee + taxesCost + affiliateCost + campaignsCost + aceleraCost;
    const netProfit = sp - totalCosts;
    const realMargin = sp > 0 ? netProfit / sp * 100 : 0;

    const roasEmpate = sp / (sp - totalCosts);
    const roasSaudavel = isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate * 1.25 : 0;
    const roasIdeal = isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate * 1.5 : 0;

    return {
      netProfit,
      realMargin,
      cp,
      roasEmpate: isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate : 0,
      roasSaudavel,
      roasIdeal,
      totalShopeeFee,
      shopeeFeePercent,
      shopeeFeeFixed,
      cpfExtra,
      packagingCost,
      taxesCost,
      taxesPercent: config?.taxes || 0,
      affiliateCost,
      affiliatePercent: config?.affiliateCommission || 0,
      campaignsCost,
      campaignsPercent: config?.shopeeCampaigns || 0,
      aceleraCost,
      aceleraPercent,
      totalCosts,
      sp,
    };
  }, [salePrice, costPrice, packaging, config]);

  const projection = useMemo(() => {
    if (!result) return null;
    return {
      revenue: result.sp * monthlySales,
      costs: result.totalCosts * monthlySales,
      profit: result.netProfit * monthlySales,
    };
  }, [result, monthlySales]);

  const handleCalculate = () => {
    if (!result) return;
    setIsCalculating(true);
    setShowAnalysis(false);
    setTimeout(() => {
      setShowResult(true);
      setIsCalculating(false);
    }, 200);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const roasProgress = useMemo(() => {
    if (!result || result.roasEmpate <= 0 || result.roasIdeal <= 0) return 0;
    const range = result.roasIdeal - result.roasEmpate;
    if (range <= 0) return 0;
    const saudavelPos = (result.roasSaudavel - result.roasEmpate) / range;
    return Math.min(Math.max(saudavelPos * 100, 0), 100);
  }, [result]);

  return (
    <div className="surface-card p-4 animate-fade-up">
      <p className="section-label mb-3">Calculadora Rápida</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="section-label mb-1.5 block">PREÇO DE CUSTO</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => { setCostPrice(e.target.value); setShowResult(false); }}
              placeholder="0,00"
              className="w-full h-12 pl-12 pr-3 bg-surface-2 border border-border rounded-lg text-foreground font-mono font-mono-num focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="section-label mb-1.5 block">PREÇO DE VENDA</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => { setSalePrice(e.target.value); setShowResult(false); }}
              placeholder="0,00"
              className="w-full h-12 pl-12 pr-3 bg-surface-2 border border-border rounded-lg text-foreground font-mono font-mono-num focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="section-label mb-1.5 block">EMBALAGEM</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={packaging}
              onChange={(e) => { setPackaging(e.target.value); setShowResult(false); }}
              placeholder="0,00"
              className="w-full h-12 pl-12 pr-3 bg-surface-2 border border-border rounded-lg text-foreground font-mono font-mono-num focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!result || isCalculating}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[15px] rounded-[10px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-40"
      >
        {isCalculating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Calcular
          </>
        )}
      </button>

      {showResult && result && projection && (
        <div className="mt-4 animate-fade-up">
          {/* Result Card */}
          <div className="mt-2 space-y-5">
            {/* Métricas — 3 colunas inline */}
            <div className="grid grid-cols-3 text-center gap-1">
              <div>
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-1.5">Lucro</p>
                <p className={cn(
                  'font-mono text-[20px] font-bold font-mono-num leading-none',
                  result.netProfit >= 0 ? 'text-success' : 'text-danger'
                )}>
                  {formatCurrency(result.netProfit)}
                </p>
              </div>
              <div>
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-1.5">Margem</p>
                <p className={cn(
                  'font-mono text-[20px] font-bold font-mono-num leading-none',
                  result.realMargin >= (config?.desiredMargin || 17) ? 'text-success' : result.realMargin >= 0 ? 'text-warning' : 'text-danger'
                )}>
                  {result.realMargin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-1.5">ROAS empate</p>
                <p className="font-mono text-[20px] font-bold font-mono-num leading-none text-warning">
                  {result.roasEmpate > 0 ? result.roasEmpate.toFixed(2) : '--'}
                </p>
              </div>
            </div>

            {/* Aviso taxas */}
            {!hasGlobalTaxes && (
              <button
                onClick={() => navigate('/settings')}
                className="w-full text-center hover:opacity-80 transition-opacity"
              >
                <span className="text-[12px] text-warning">⚠ Configure suas taxas para resultado preciso</span>
              </button>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="flex-1 h-11 border border-border rounded-lg text-[13px] font-medium text-text-2 hover:bg-surface-2 active:scale-[0.98] transition-all"
              >
                {showAnalysis ? '↑ Fechar' : '↓ Ver análise'}
              </button>
              <button
                onClick={() => onSaveProduct({ costPrice, salePrice, packaging })}
                className="flex-1 h-11 bg-accent rounded-lg text-[13px] font-semibold text-white hover:bg-[#EA6C0A] active:scale-[0.98] transition-all"
              >
                Salvar produto
              </button>
            </div>
          </div>

          {/* ANÁLISE COMPLETA */}
          {showAnalysis && (
            <div className="mt-3 bg-surface-2 rounded-[10px] p-3 animate-fade-up space-y-0">
              {/* Custos */}
              <div className="pb-3">
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-2">Custos</p>
                <div className="space-y-1.5">
                  <CostRow label="Taxa Shopee" value={result.totalShopeeFee} format={formatCurrency} />
                  {result.packagingCost > 0 && (
                    <CostRow label="Embalagem e Insumos" value={result.packagingCost} format={formatCurrency} />
                  )}
                  {result.taxesCost > 0 && (
                    <CostRow label={`Impostos (${result.taxesPercent}%)`} value={result.taxesCost} format={formatCurrency} />
                  )}
                  {result.affiliateCost > 0 && (
                    <CostRow label={`Comissão Afiliados (${result.affiliatePercent}%)`} value={result.affiliateCost} format={formatCurrency} />
                  )}
                  {result.campaignsCost > 0 && (
                    <CostRow label={`Campanhas Destaque (${result.campaignsPercent}%)`} value={result.campaignsCost} format={formatCurrency} />
                  )}
                  {result.aceleraCost > 0 && (
                    <CostRow label={`Shopee Acelera (${result.aceleraPercent}%)`} value={result.aceleraCost} format={formatCurrency} />
                  )}
                  {result.cpfExtra > 0 && (
                    <CostRow label="Adicional CPF" value={result.cpfExtra} format={formatCurrency} />
                  )}
                  <div className="border-t border-border pt-1.5 mt-1.5">
                    <CostRow label="Total de custos" value={result.totalCosts} format={formatCurrency} bold />
                    <div className="mt-1.5" />
                    <CostRow label="Preço de venda" value={result.sp} format={formatCurrency} />
                  </div>
                </div>

                {!hasGlobalTaxes && (
                  <div className="mt-3 flex items-start gap-1.5 bg-background/50 rounded-lg p-2">
                    <Info className="w-3.5 h-3.5 text-text-3 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-text-3">Configure impostos e taxas em Configurações para cálculo mais preciso.</p>
                      <button onClick={() => navigate('/settings')} className="text-[11px] text-primary font-medium hover:underline mt-0.5">
                        Ir para Configurações →
                      </button>
                    </div>
                  </div>
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
                      <span className="text-[10px] text-text-3 ml-1.5">mínimo para lucrar</span>
                    </div>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{result.roasSaudavel > 0 ? result.roasSaudavel.toFixed(2) : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[13px] text-text-2">Ideal</span>
                      <span className="text-[10px] text-text-3 ml-1.5">meta para escalar</span>
                    </div>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-primary">{result.roasIdeal > 0 ? result.roasIdeal.toFixed(2) : '--'}</span>
                  </div>

                  {result.roasEmpate > 0 && result.roasIdeal > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] text-text-3 mb-1">
                        <span>Empate</span>
                        <span>Saudável</span>
                        <span>Ideal</span>
                      </div>
                      <div className="relative h-1.5 bg-background rounded-full overflow-hidden">
                        <div className="absolute left-0 top-0 h-full bg-primary/30 rounded-full" style={{ width: '100%' }} />
                        <div className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all" style={{ width: `${roasProgress}%` }} />
                      </div>
                      <div className="relative h-2 mt-0.5">
                        <div
                          className="absolute top-0 w-1.5 h-1.5 rounded-full bg-primary border border-background"
                          style={{ left: `${roasProgress}%`, transform: 'translateX(-50%)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Projeção */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider">Projeção</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="10000"
                      value={monthlySales}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 1;
                        setMonthlySales(Math.min(Math.max(v, 1), 10000));
                      }}
                      className="w-16 h-6 text-[12px] font-mono font-mono-num text-center bg-background border border-border rounded px-1 text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[10px] text-text-3">vendas/mês</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <CostRow label="Receita bruta" value={projection.revenue} format={formatCurrency} />
                  <CostRow label="Custos totais" value={projection.costs} format={formatCurrency} />
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Lucro mensal</span>
                    <span className={cn(
                      'font-mono text-[14px] font-bold font-mono-num',
                      projection.profit >= 0 ? 'text-success' : 'text-danger'
                    )}>{formatCurrency(projection.profit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-text-2">Status</span>
                    <span className="text-[13px] font-medium">
                      {projection.profit > 0 && result.realMargin >= (config?.desiredMargin || 17)
                        ? '🟢 Lucrativo'
                        : projection.profit >= 0
                          ? '🟡 Atenção'
                          : '🔴 Prejuízo'}
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

function CostRow({ label, value, format, bold }: { label: string; value: number; format: (v: number) => string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn('text-[13px] text-text-2', bold && 'font-semibold')}>{label}</span>
      <span className={cn('font-mono text-[14px] font-mono-num text-foreground', bold ? 'font-bold' : 'font-bold')}>{format(value)}</span>
    </div>
  );
}
