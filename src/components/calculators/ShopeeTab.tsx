import { useState } from 'react';
import { NumInput, ResultPanel, TaxInput, useTaxFromConfig, CostLine, fmt, fmtPct } from './shared';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getShopeeFeeForPrice, SHOPEE_ACELERA_RATES, ShopeeAceleraOption } from '@/types/store';
import { useStore } from '@/contexts/StoreContext';
import { Info, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ShopeeTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const { taxes: taxesPercent, setTaxes: setTaxesPercent, configTax } = useTaxFromConfig();

  const [isCpf, setIsCpf] = useState(false);
  const [hasOver450, setHasOver450] = useState(false);
  const [affiliatePercent, setAffiliatePercent] = useState('');
  const [enableAffiliate, setEnableAffiliate] = useState(false);
  const [campaignsPercent, setCampaignsPercent] = useState('');
  const [enableCampaigns, setEnableCampaigns] = useState(false);
  const [acelera, setAcelera] = useState<ShopeeAceleraOption>('none');

  // Save product modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { addProduct, currentStore } = useStore();

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const pkg = parseFloat(packagingCost) || 0;
  const tax = parseFloat(taxesPercent) || 0;
  const aff = enableAffiliate ? (parseFloat(affiliatePercent) || 0) : 0;
  const camp = enableCampaigns ? (parseFloat(campaignsPercent) || 0) : 0;

  const isReady = sp > 0 && cp > 0;

  const feeRange = getShopeeFeeForPrice(sp);
  const shopeeFee = sp > 0 ? sp * (feeRange.percent / 100) + feeRange.fixed : 0;
  const taxesCost = sp * (tax / 100);
  const affiliateCost = sp * (aff / 100);
  const campaignsCost = sp * (camp / 100);
  const aceleraRate = SHOPEE_ACELERA_RATES[acelera] || 0;
  const aceleraCost = sp * aceleraRate;

  const totalCosts = cp + pkg + shopeeFee + taxesCost + affiliateCost + campaignsCost + aceleraCost;
  const netProfit = sp - totalCosts;
  const margin = sp > 0 ? (netProfit / sp) * 100 : 0;

  const costs: CostLine[] = [
    { label: 'Custo do produto', value: cp },
    { label: `Taxa Shopee (${feeRange.percent}% + ${fmt(feeRange.fixed)})`, value: shopeeFee },
    ...(pkg > 0 ? [{ label: 'Embalagem', value: pkg }] : []),
    ...(taxesCost > 0 ? [{ label: `Impostos (${tax}%)`, value: taxesCost }] : []),
    ...(affiliateCost > 0 ? [{ label: `Afiliado (${aff}%)`, value: affiliateCost }] : []),
    ...(campaignsCost > 0 ? [{ label: `Campanhas (${camp}%)`, value: campaignsCost }] : []),
    ...(aceleraCost > 0 ? [{ label: `Acelera (${(aceleraRate * 100).toFixed(1)}%)`, value: aceleraCost }] : []),
  ];

  const handleSaveProduct = async () => {
    if (!productName.trim() || !currentStore) return;
    setIsSaving(true);
    try {
      await addProduct({
        storeId: currentStore.id,
        name: productName.trim(),
        salePrice: sp,
        costPrice: cp,
        packagingCost: pkg,
        adsCost: 0,
        adsRevenue: 0,
        stockQuantity: 0,
        minStockQuantity: 5,
        hasVariations: false,
        attributes: [],
        variations: [],
        shopeeAcelera: acelera,
      });
      toast.success('Produto salvo com sucesso!');
      setProductName('');
      setShowSaveModal(false);
    } catch {
      toast.error('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Inputs */}
      <div className="space-y-4">
        <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-3">
          <p className="section-label">Valores do produto</p>
          <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />
          <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />
          <NumInput label="Embalagem" value={packagingCost} onChange={setPackagingCost} suffix="R$" />
          <TaxInput value={taxesPercent} onChange={setTaxesPercent} configValue={configTax} />
        </div>

        {/* Fee info */}
        {sp > 0 && (
          <div className="rounded-[10px] bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-2">
              Faixa aplicada: <span className="font-semibold text-foreground">{feeRange.label}</span> — {feeRange.percent}% + {fmt(feeRange.fixed)} fixo
            </p>
          </div>
        )}

        {/* Toggles */}
        <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-3">
          <p className="section-label">Configurações da loja</p>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-text-2">Vendedor CPF</Label>
            <Switch checked={isCpf} onCheckedChange={setIsCpf} />
          </div>

          {isCpf && (
            <div className="flex items-center justify-between">
              <Label className="text-xs text-text-2">Mais de 450 pedidos</Label>
              <Switch checked={hasOver450} onCheckedChange={setHasOver450} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-xs text-text-2">Afiliado</Label>
            <Switch checked={enableAffiliate} onCheckedChange={setEnableAffiliate} />
          </div>
          {enableAffiliate && (
            <NumInput label="Comissão afiliado" value={affiliatePercent} onChange={setAffiliatePercent} suffix="%" />
          )}

          <div className="flex items-center justify-between">
            <Label className="text-xs text-text-2">Campanhas Shopee</Label>
            <Switch checked={enableCampaigns} onCheckedChange={setEnableCampaigns} />
          </div>
          {enableCampaigns && (
            <NumInput label="Taxa campanha" value={campaignsPercent} onChange={setCampaignsPercent} suffix="%" />
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-text-2">Shopee Acelera</Label>
            <Select value={acelera} onValueChange={(v) => setAcelera(v as ShopeeAceleraOption)}>
              <SelectTrigger className="input-modern">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não usa</SelectItem>
                <SelectItem value="indicado">Indicado (2,5%)</SelectItem>
                <SelectItem value="nao_indicado">Não indicado (3,5%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <ResultPanel costs={costs} netProfit={netProfit} margin={margin} salePrice={sp} isReady={isReady} showRoas />

        {isReady && currentStore && (
          <div className="pt-2 border-t border-border">
            <Button
              onClick={() => setShowSaveModal(true)}
              className="w-full rounded-xl gap-2 h-11 text-sm font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              Salvar como produto
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Salva os dados no cadastro de produtos da loja
            </p>
          </div>
        )}
      </div>

      {/* Save Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nome do produto</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Cropped Corset Feminino"
                autoFocus
              />
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço de venda</span>
                <span className="font-medium">{fmt(sp)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo</span>
                <span className="font-medium">{fmt(cp)}</span>
              </div>
              {pkg > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Embalagem</span>
                  <span className="font-medium">{fmt(pkg)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margem</span>
                <span className={cn('font-medium', netProfit >= 0 ? 'text-success' : 'text-danger')}>
                  {fmtPct(margin)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lucro</span>
                <span className={cn('font-medium', netProfit >= 0 ? 'text-success' : 'text-danger')}>
                  {fmt(netProfit)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSaveProduct}
              disabled={!productName.trim() || isSaving}
              className="w-full rounded-xl"
            >
              {isSaving ? 'Salvando...' : 'Salvar produto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
