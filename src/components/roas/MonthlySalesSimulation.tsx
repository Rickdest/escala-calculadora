import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface SimulationProps {
  salePrice: number;
  costPrice: number;
  taxaShopee: number;
  lucroBruto: number;
  roasEmpate: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function MonthlySalesSimulation({ salePrice, costPrice, taxaShopee, lucroBruto, roasEmpate }: SimulationProps) {
  const [open, setOpen] = useState(false);
  const [salesCount, setSalesCount] = useState(50);

  const receitaTotal = salePrice * salesCount;
  const totalTaxas = taxaShopee * salesCount;
  const totalCusto = costPrice * salesCount;
  const investimentoAds = roasEmpate > 0 ? receitaTotal / roasEmpate : 0;
  const lucroLiquido = receitaTotal - totalTaxas - totalCusto - investimentoAds;

  const status = lucroLiquido < 0 ? 'danger' : lucroLiquido < receitaTotal * 0.05 ? 'warning' : 'success';
  const statusConfig = {
    danger: { emoji: '🔴', label: 'Prejuízo', bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive' },
    warning: { emoji: '🟡', label: 'Zona de risco', bg: 'bg-warning/10 border-warning/30', text: 'text-warning' },
    success: { emoji: '🟢', label: 'Lucrativo', bg: 'bg-success/10 border-success/30', text: 'text-success' },
  }[status];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="glass-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-secondary/30">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Simulação Mensal</span>
            </div>
            <ChevronDown className={cn('w-4 h-4 transition-transform text-muted-foreground', open && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 animate-fade-in">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Vendas por mês</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={salesCount}
                    onChange={(e) => setSalesCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 h-8 text-sm text-center font-bold input-modern"
                  />
                </div>
              </div>
              <Slider
                value={[salesCount]}
                onValueChange={([v]) => setSalesCount(v)}
                min={1}
                max={1000}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span><span>500</span><span>1000</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Receita Bruta', value: formatCurrency(receitaTotal), color: 'text-foreground' },
                { label: 'Total Taxas Shopee', value: formatCurrency(totalTaxas), color: 'text-destructive' },
                { label: 'Investimento Ads (empate)', value: formatCurrency(investimentoAds), color: 'text-warning' },
                { label: 'Lucro Líquido Mensal', value: formatCurrency(lucroLiquido), color: lucroLiquido >= 0 ? 'text-success' : 'text-destructive' },
              ].map(item => (
                <div key={item.label} className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{item.label}</p>
                  <p className={cn('text-sm font-extrabold tabular-nums mt-1', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className={cn('rounded-xl border p-3 flex items-center gap-2', statusConfig.bg)}>
              <span className="text-lg">{statusConfig.emoji}</span>
              <div>
                <p className={cn('text-sm font-bold', statusConfig.text)}>{statusConfig.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {salesCount} vendas/mês × {formatCurrency(salePrice)}/un
                </p>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
