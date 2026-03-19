import { useState, useMemo } from 'react';
import { Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice } from '@/types/store';
import { cn } from '@/lib/utils';

interface QuickCalculatorProps {
  onSaveProduct: (prefill: { costPrice: string; salePrice: string; packaging: string }) => void;
}

export function QuickCalculator({ onSaveProduct }: QuickCalculatorProps) {
  const { currentStore } = useStore();
  const config = currentStore?.config;
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

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
    const aceleraCost = aceleraVal === 'indicado' ? sp * 0.025 : aceleraVal === 'nao_indicado' ? sp * 0.035 : 0;

    const packagingCost = parseFloat(packaging) || 0;
    const totalCosts = cp + packagingCost + totalShopeeFee + taxesCost + affiliateCost + campaignsCost + aceleraCost;
    const netProfit = sp - totalCosts;
    const realMargin = sp > 0 ? netProfit / sp * 100 : 0;

    const roasEmpate = sp / (sp - totalCosts);
    const roasSaudavel = isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate * 1.25 : 0;
    const roasIdeal = isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate * 1.5 : 0;

    const monthlySales = 50;
    const monthlyRevenue = sp * monthlySales;
    const monthlyCosts = totalCosts * monthlySales;
    const monthlyProfit = netProfit * monthlySales;

    return {
      netProfit,
      realMargin,
      roasEmpate: isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate : 0,
      roasSaudavel,
      roasIdeal,
      totalShopeeFee,
      packagingCost,
      totalCosts,
      sp,
      monthlyRevenue,
      monthlyCosts,
      monthlyProfit,
    };
  }, [salePrice, costPrice, packaging, config]);

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

  return (
    <div className="surface-card p-4 animate-fade-up">
      <p className="section-label mb-3">Calculadora Rápida</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="section-label mb-1.5 block">Preço de Custo</label>
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

      {showResult && result && (
        <div className="mt-4 animate-fade-up">
          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="section-label mb-1">Lucro</p>
                <p className={cn(
                  'font-mono text-[22px] font-bold font-mono-num leading-none',
                  result.netProfit >= 0 ? 'text-success' : 'text-danger'
                )}>
                  {formatCurrency(result.netProfit)}
                </p>
              </div>
              <div className="text-center">
                <p className="section-label mb-1">Margem</p>
                <p className={cn(
                  'font-mono text-[22px] font-bold font-mono-num leading-none',
                  result.realMargin >= (config?.desiredMargin || 17) ? 'text-success' : result.realMargin >= 0 ? 'text-warning' : 'text-danger'
                )}>
                  {result.realMargin.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="section-label mb-1">ROAS Ideal</p>
                <p className="font-mono text-[22px] font-bold font-mono-num leading-none text-primary">
                  {result.roasIdeal > 0 ? result.roasIdeal.toFixed(2) : '--'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-[13px] text-text-2 font-medium hover:text-foreground transition-colors flex items-center gap-1"
              >
                {showAnalysis ? 'Fechar análise' : 'Ver análise completa'}
                {showAnalysis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <span className="text-text-3 text-[13px]">·</span>
              <button
                onClick={() => onSaveProduct({ costPrice, salePrice, packaging })}
                className="text-[13px] text-primary font-medium hover:underline"
              >
                Salvar produto →
              </button>
            </div>
          </div>

          {showAnalysis && (
            <div className="mt-3 bg-surface-2 rounded-[10px] p-3 animate-fade-up space-y-0">
              {/* Custos */}
              <div className="pb-3">
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-2">Custos</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Taxa Shopee</span>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{formatCurrency(result.totalShopeeFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Embalagem</span>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{formatCurrency(result.packagingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Total de custos</span>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{formatCurrency(result.totalCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Preço de venda</span>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{formatCurrency(result.sp)}</span>
                  </div>
                </div>
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
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Projeção */}
              <div className="pt-3">
                <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider mb-2">Projeção (50 vendas/mês)</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Receita bruta</span>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{formatCurrency(result.monthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Custos totais</span>
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">{formatCurrency(result.monthlyCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-text-2">Lucro mensal</span>
                    <span className={cn(
                      'font-mono text-[14px] font-bold font-mono-num',
                      result.monthlyProfit >= 0 ? 'text-success' : 'text-danger'
                    )}>{formatCurrency(result.monthlyProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-text-2">Status</span>
                    <span className="text-[13px] font-medium">
                      {result.monthlyProfit > 0 && result.realMargin >= (config?.desiredMargin || 17)
                        ? '🟢 Lucrativo'
                        : result.monthlyProfit >= 0
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
