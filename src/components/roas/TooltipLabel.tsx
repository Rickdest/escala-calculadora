import { HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TooltipLabelProps {
  label: string;
  tooltip: string;
  className?: string;
  htmlFor?: string;
}

const TOOLTIPS: Record<string, string> = {
  'roas': 'Retorno sobre o investimento em anúncio. Ex: ROAS 3 significa que para cada R$1 investido, você vendeu R$3.',
  'roas_empate': 'O ROAS mínimo para não ter prejuízo. Abaixo disso, você está perdendo dinheiro.',
  'roas_ideal': 'O ROAS que garante uma margem saudável de lucro após pagar todos os custos.',
  'taxa_shopee': 'Percentual que a Shopee cobra sobre cada venda. Varia por categoria e tipo de loja.',
  'gasto_ads': 'Valor total investido em anúncios na Shopee Ads.',
  'receita_ads': 'Receita gerada diretamente pelos anúncios (GMV de Ads).',
  'lucro_bruto': 'Lucro por venda antes de descontar o investimento em anúncios.',
  'preco_venda': 'Preço que o cliente paga pelo produto na Shopee.',
  'custo_produto': 'Custo total para adquirir ou produzir o produto.',
};

export function getTooltipText(key: string): string {
  return TOOLTIPS[key] || '';
}

export function TooltipLabel({ label, tooltip, className, htmlFor }: TooltipLabelProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('flex items-center gap-1.5', className)}>
        <Label htmlFor={htmlFor} className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {label}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground/60 hover:text-primary transition-colors focus:outline-none">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
