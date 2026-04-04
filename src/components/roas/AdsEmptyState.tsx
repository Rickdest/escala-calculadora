import { Button } from '@/components/ui/button';
import { Upload, ExternalLink, BarChart3, Download, ShoppingBag, CheckCircle2 } from 'lucide-react';

export function AdsEmptyState({ onImport, onShopeeIntegration, onImportAds, isConnected, syncing }: { onImport: () => void; onShopeeIntegration: () => void; onImportAds?: () => void; isConnected?: boolean; syncing?: boolean }) {
  // When connected, show API import as primary
  if (isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-bold text-foreground">Sua Shopee Ads está conectada!</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Importe os dados agora para ver ROAS, campanhas e métricas de performance.
          </p>
        </div>

        <Button
          onClick={onImportAds}
          disabled={syncing}
          className="h-12 w-full max-w-md rounded-xl text-sm font-bold gap-2"
        >
          <Download className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Importando Ads...' : 'Importar Ads via Shopee API'}
        </Button>

        <div className="flex items-center gap-3 w-full max-w-md">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou importe manualmente</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button variant="outline" onClick={onImport} className="h-10 w-full max-w-md rounded-xl text-xs font-medium gap-2">
          <Upload className="w-3.5 h-3.5" /> Importar CSV do Seller Center
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-lg font-bold text-foreground">Importe seu relatório de Shopee Ads</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
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
                <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {text}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
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
        <ShoppingBag className="w-4 h-4" /> Conectar Shopee para importar Ads
      </Button>
    </div>
  );
}
