import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice, Product } from '@/types/store';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, AlertTriangle, Rocket, ChevronDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoasData {
  roasAtual: number | null;
  roasEmpate: number | null;
  roasIdeal: number | null;
  lucroBruto: number;
  taxaShopee: number;
  valorRecebido: number;
  margemInsuficiente: boolean;
}

function calcRoas(product: Product, gastoAds: number, receitaAds: number, config: ReturnType<typeof getShopeeFeeForPrice>): RoasData {
  const precoVenda = product.salePrice;
  const custoP = product.costPrice;

  const taxaShopee = (precoVenda * config.percent / 100) + config.fixed;
  const valorRecebido = precoVenda - taxaShopee;
  const lucroBruto = valorRecebido - custoP;

  if (lucroBruto <= 0) {
    return { roasAtual: null, roasEmpate: null, roasIdeal: null, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: true };
  }

  const roasEmpate = parseFloat((precoVenda / lucroBruto).toFixed(2));
  const roasIdeal = parseFloat((roasEmpate * 1.4).toFixed(2));
  const roasAtual = gastoAds > 0 ? parseFloat((receitaAds / gastoAds).toFixed(2)) : null;

  return { roasAtual, roasEmpate, roasIdeal, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: false };
}

function getRoasStatus(roasAtual: number, roasEmpate: number, roasIdeal: number) {
  if (roasAtual < roasEmpate) return 'danger';
  if (roasAtual < roasIdeal) return 'warning';
  return 'success';
}

function getRoasMessage(status: string) {
  switch (status) {
    case 'danger': return '⚠️ Os anúncios estão gerando prejuízo.';
    case 'warning': return '⚡ Os anúncios estão gerando lucro, mas ainda podem melhorar.';
    case 'success': return '🚀 Campanha saudável e pronta para escalar.';
    default: return '';
  }
}

const statusColors = {
  danger: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
};

const statusBg = {
  danger: 'bg-destructive/10 border-destructive/30',
  warning: 'bg-warning/10 border-warning/30',
  success: 'bg-success/10 border-success/30',
};

export function RoasAnalysis() {
  const { currentStore } = useStore();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [gastoAds, setGastoAds] = useState<string>('');
  const [receitaAds, setReceitaAds] = useState<string>('');

  const selectedProduct = useMemo(() => {
    if (!currentStore || !selectedProductId) return null;
    return currentStore.products.find(p => p.id === selectedProductId) || null;
  }, [currentStore, selectedProductId]);

  const roasData = useMemo(() => {
    if (!selectedProduct) return null;
    const feeRange = getShopeeFeeForPrice(selectedProduct.salePrice);
    return calcRoas(selectedProduct, parseFloat(gastoAds) || 0, parseFloat(receitaAds) || 0, feeRange);
  }, [selectedProduct, gastoAds, receitaAds]);

  const progressData = useMemo(() => {
    if (!roasData || roasData.margemInsuficiente || !roasData.roasEmpate || !roasData.roasIdeal || roasData.roasAtual === null) return null;
    const maxRoas = Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1);
    const percent = Math.min((roasData.roasAtual / maxRoas) * 100, 100);
    const empatePercent = (roasData.roasEmpate / maxRoas) * 100;
    const idealPercent = (roasData.roasIdeal / maxRoas) * 100;
    return { percent, empatePercent, idealPercent };
  }, [roasData]);

  if (!currentStore || currentStore.products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
          <Target className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-foreground mb-2 text-lg">Sem produtos</h3>
        <p className="text-sm text-muted-foreground">Adicione produtos para usar a análise de ROAS</p>
      </div>
    );
  }

  const status = roasData && !roasData.margemInsuficiente && roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasIdeal
    ? getRoasStatus(roasData.roasAtual, roasData.roasEmpate, roasData.roasIdeal)
    : null;

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      {/* Product Selector */}
      <div className="glass-card p-4 space-y-4">
        <Label className="text-sm font-bold">Selecione o Produto</Label>
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um produto..." />
          </SelectTrigger>
          <SelectContent>
            {currentStore.products.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.salePrice)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProduct && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Gasto em Ads (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={gastoAds}
                onChange={e => setGastoAds(e.target.value)}
                placeholder="0,00"
                className="input-modern"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Receita dos Ads (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={receitaAds}
                onChange={e => setReceitaAds(e.target.value)}
                placeholder="0,00"
                className="input-modern"
              />
            </div>
          </div>
        )}
      </div>

      {/* Margin Alert */}
      {roasData?.margemInsuficiente && (
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div>
              <p className="font-bold text-destructive text-sm">Margem insuficiente para anunciar</p>
              <p className="text-xs text-muted-foreground mt-1">
                O lucro antes de Ads é {formatCurrency(roasData.lucroBruto)}. Revise o custo ou preço de venda.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ROAS Cards */}
      {roasData && !roasData.margemInsuficiente && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {/* ROAS Atual */}
            <div className={cn(
              'glass-card p-4 text-center',
              status && statusBg[status as keyof typeof statusBg]
            )}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">ROAS Atual</p>
              <p className={cn(
                'text-2xl font-extrabold tabular-nums',
                roasData.roasAtual !== null
                  ? statusColors[status as keyof typeof statusColors] || 'text-foreground'
                  : 'text-muted-foreground'
              )}>
                {roasData.roasAtual !== null ? roasData.roasAtual.toFixed(2) : '—'}
              </p>
            </div>

            {/* ROAS Empate */}
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Empate</p>
              <p className="text-2xl font-extrabold tabular-nums text-warning">
                {roasData.roasEmpate!.toFixed(2)}
              </p>
            </div>

            {/* ROAS Ideal */}
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Ideal</p>
              <p className="text-2xl font-extrabold tabular-nums text-success">
                {roasData.roasIdeal!.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          {progressData && status && (
            <div className="glass-card p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Posição do ROAS</p>
              <div className="relative">
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      status === 'danger' && 'bg-destructive',
                      status === 'warning' && 'bg-warning',
                      status === 'success' && 'bg-success',
                    )}
                    style={{ width: `${progressData.percent}%` }}
                  />
                </div>
                {/* Markers */}
                <div
                  className="absolute top-0 h-3 w-0.5 bg-warning"
                  style={{ left: `${progressData.empatePercent}%` }}
                  title="Empate"
                />
                <div
                  className="absolute top-0 h-3 w-0.5 bg-success"
                  style={{ left: `${progressData.idealPercent}%` }}
                  title="Ideal"
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>0</span>
                <span className="text-warning">Empate: {roasData.roasEmpate!.toFixed(2)}</span>
                <span className="text-success">Ideal: {roasData.roasIdeal!.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Interpretation */}
          {status && (
            <div className={cn('glass-card p-4 border', statusBg[status as keyof typeof statusBg])}>
              <p className={cn('font-bold text-sm', statusColors[status as keyof typeof statusColors])}>
                {getRoasMessage(status)}
              </p>
            </div>
          )}

          {/* Breakdown */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Detalhamento</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço de Venda</span>
              <span className="font-semibold">{formatCurrency(selectedProduct!.salePrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa Shopee</span>
              <span className="font-semibold text-destructive">-{formatCurrency(roasData.taxaShopee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Recebido</span>
              <span className="font-semibold">{formatCurrency(roasData.valorRecebido)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo do Produto</span>
              <span className="font-semibold text-destructive">-{formatCurrency(selectedProduct!.costPrice)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border/50">
              <span className="font-bold">Lucro antes de Ads</span>
              <span className={cn('font-bold', roasData.lucroBruto >= 0 ? 'text-success' : 'text-destructive')}>
                {formatCurrency(roasData.lucroBruto)}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="glass-card p-4 bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>ROAS de empate</strong> é o mínimo necessário para não ter prejuízo.{' '}
              <strong>ROAS ideal</strong> indica um nível saudável de lucro para escalar campanhas.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
