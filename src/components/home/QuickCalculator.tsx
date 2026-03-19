import { useState, useMemo } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice } from '@/types/store';
import { cn } from '@/lib/utils';

interface QuickCalculatorProps {
  onSaveProduct: () => void;
}

export function QuickCalculator({ onSaveProduct }: QuickCalculatorProps) {
  const { currentStore } = useStore();
  const config = currentStore?.config;
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

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
    const roasIdeal = isFinite(roasEmpate) && roasEmpate > 0 ? roasEmpate * 1.5 : 0;

    return { netProfit, realMargin, roasIdeal };
  }, [salePrice, costPrice, packaging, config]);

  const handleCalculate = () => {
    if (!result) return;
    setIsCalculating(true);
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
              onChange={(e) => {setCostPrice(e.target.value);setShowResult(false);}}
              placeholder="0,00"
              className="w-full h-12 pl-12 pr-3 bg-surface-2 border border-border rounded-lg text-foreground font-mono font-mono-num focus:border-primary focus:outline-none transition-colors" />
            
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
              onChange={(e) => {setSalePrice(e.target.value);setShowResult(false);}}
              placeholder="0,00"
              className="w-full h-12 pl-12 pr-3 bg-surface-2 border border-border rounded-lg text-foreground font-mono font-mono-num focus:border-primary focus:outline-none transition-colors" />
            
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="section-label mb-1.5 block">EMBALAGEM E INSUMOS

          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
            <input type="number" inputMode="decimal"
            step="0.01"
            min="0"
            value={packaging}
            onChange={(e) => {setPackaging(e.target.value);setShowResult(false);}}
            placeholder="0,00"
            className="w-full h-12 pl-12 pr-3 bg-surface-2 border border-border rounded-lg text-foreground font-mono font-mono-num focus:border-primary focus:outline-none transition-colors" />
            
          </div>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!result || isCalculating}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[15px] rounded-[10px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-40">
        
        {isCalculating ?
        <Loader2 className="w-4 h-4 animate-spin" /> :

        <>
            <Zap className="w-4 h-4" />
            Calcular
          </>
        }
      </button>

      {showResult && result &&
      <div className="mt-4 pt-4 border-t border-border animate-fade-up">
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
          <button
          onClick={onSaveProduct}
          className="mt-3 text-[13px] text-primary font-medium hover:underline">
          
            Salvar este produto →
          </button>
        </div>
      }
    </div>);

}