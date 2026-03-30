import { Button } from '@/components/ui/button';
import { Upload, ExternalLink, BarChart3, Download, ShoppingBag } from 'lucide-react';

export function AdsEmptyState({ onImport, onShopeeIntegration }: { onImport: () => void; onShopeeIntegration: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-lg font-bold text-foreground">Importe seu relatório de Shopee Ads</p>
        <p className="text-sm text-text-2 max-w-md mx-auto">
          Siga os passos abaixo para exportar o CSV no Shopee Seller Center
        </p>
      </div>

      {/* Step-by-step guide */}
      <div className="w-full max-w-md space-y-3 text-left">
        {[
          { step: 1, icon: ExternalLink, text: 'Acesse o Shopee Seller Center', sub: 'seller.shopee.com.br' },
          { step: 2, icon: BarChart3, text: 'Vá em Marketing → Shopee Ads', sub: 'Clique em "Relatórios" ou "Todos os Anúncios"' },
          { step: 3, icon: Download, text: 'Exporte o CSV', sub: 'Aceita relatório geral ou individual por produto' },
        ].map(({ step, icon: Icon, text, sub }) => (
          <div key={step} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
              {step}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-text-3" /> {text}
              </p>
              <p className="text-xs text-text-3 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onImport} className="h-12 w-full max-w-md rounded-xl text-sm font-bold gap-2 mt-2">
        <Upload className="w-4 h-4" /> Importar CSV
      </Button>

      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button
        variant="outline"
        onClick={onShopeeIntegration}
        className="h-12 w-full max-w-md rounded-xl text-sm font-bold gap-2 border-[#EE4D2D]/30 text-[#EE4D2D] hover:bg-[#EE4D2D]/5 hover:text-[#EE4D2D]"
      >
        <ShoppingBag className="w-4 h-4" /> Integrar com Shopee
      </Button>
    </div>
  );
}
