import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface QuickRegisterModalProps {
  adData: EnrichedAdsData;
  onClose: () => void;
  onRegistered: (productId: string) => void;
}

export function QuickRegisterModal({ adData, onClose, onRegistered }: QuickRegisterModalProps) {
  const { currentStore, addProduct } = useStore();
  const [costPrice, setCostPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [saving, setSaving] = useState(false);

  const config = currentStore?.config;

  // Suggested sale price from CSV data
  const suggestedPrice = useMemo(() => {
    if (adData.itens_vendidos > 0) return adData.gmv / adData.itens_vendidos;
    if (adData.gmv_direto > 0 && (adData as any).itens_vendidos_diretos > 0) {
      return adData.gmv_direto / (adData as any).itens_vendidos_diretos;
    }
    return 0;
  }, [adData]);

  const adRoas = adData.roas_direto || adData.roas;
  const cost = parseFloat(costPrice) || 0;
  const pack = parseFloat(packaging) || 0;

  // Live preview calculations
  const preview = useMemo(() => {
    if (cost <= 0 || suggestedPrice <= 0 || !config) return null;

    // Simplified ROAS empate calc
    const shopeeFeePercent = config.isCpfSeller ? 20 : 14;
    const totalFees = suggestedPrice * (shopeeFeePercent / 100) + 4; // simplified
    const lucroBruto = suggestedPrice - cost - pack - totalFees;
    const margem = suggestedPrice > 0 ? (lucroBruto / suggestedPrice) * 100 : 0;
    const roasEmpate = margem > 0 ? 100 / margem : Infinity;

    return {
      margin: margem,
      profit: lucroBruto,
      roasEmpate: roasEmpate === Infinity ? 0 : roasEmpate,
    };
  }, [cost, pack, suggestedPrice, config]);

  const handleRegister = async () => {
    if (!currentStore || cost <= 0) return;
    setSaving(true);
    try {
      const newProduct = await addProduct({
        storeId: currentStore.id,
        name: adData.nome_produto_csv,
        costPrice: cost,
        salePrice: suggestedPrice,
        packagingCost: pack,
        adsCost: 0,
        adsRevenue: 0,
        stockQuantity: 0,
        minStockQuantity: 5,
        hasVariations: false,
        attributes: [],
        variations: [],
        shopeeAcelera: 'none',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success('Produto cadastrado e vinculado!');
      onRegistered(newProduct.id);
    } catch {
      toast.error('Erro ao cadastrar produto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-5 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Cadastro Rápido</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-3" />
          </button>
        </div>

        {/* Product name (read-only) */}
        <div>
          <label className="section-label">Nome do produto</label>
          <p className="text-sm font-medium text-foreground truncate mt-1">{adData.nome_produto_csv}</p>
        </div>

        {/* Sale price (calculated) */}
        <div>
          <label className="section-label">Preço de venda (calculado do CSV)</label>
          <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-1">
            {suggestedPrice > 0 ? fmt(suggestedPrice) : '—'}
          </p>
        </div>

        {/* Cost input */}
        <div>
          <label className="section-label">Custo do produto *</label>
          <Input
            type="number"
            value={costPrice}
            onChange={e => setCostPrice(e.target.value)}
            placeholder="Quanto paga no fornecedor"
            className="h-12 mt-1"
            autoFocus
          />
        </div>

        {/* Packaging (optional) */}
        <div>
          <label className="section-label">Embalagem (opcional)</label>
          <Input
            type="number"
            value={packaging}
            onChange={e => setPackaging(e.target.value)}
            placeholder="0"
            className="h-10 mt-1"
          />
        </div>

        {/* Live preview */}
        {preview && preview.roasEmpate > 0 && (
          <div className="rounded-xl bg-surface-2 p-4 space-y-3">
            <p className="section-label">Preview da análise</p>
            <div className="grid grid-cols-3 gap-3 text-center text-sm font-mono tabular-nums">
              <div>
                <p className="text-text-3 text-[10px]">Margem</p>
                <p className={cn('font-bold', preview.margin >= 17 ? 'text-success' : 'text-warning')}>
                  {preview.margin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-text-3 text-[10px]">Lucro/un</p>
                <p className="font-bold text-foreground">{fmt(preview.profit)}</p>
              </div>
              <div>
                <p className="text-text-3 text-[10px]">ROAS Empate</p>
                <p className="font-bold text-warning">{preview.roasEmpate.toFixed(2)}</p>
              </div>
            </div>
            <p className={cn('text-xs font-bold text-center', adRoas >= preview.roasEmpate ? 'text-success' : 'text-destructive')}>
              {adRoas >= preview.roasEmpate
                ? `✅ ROAS atual (${adRoas.toFixed(2)}) está ACIMA do empate — lucrativo!`
                : `🔴 ROAS atual (${adRoas.toFixed(2)}) está ABAIXO do empate — prejuízo!`}
            </p>
          </div>
        )}

        <Button
          onClick={handleRegister}
          disabled={!cost || saving}
          className="w-full h-12 text-sm font-bold"
        >
          {saving ? 'Cadastrando...' : 'Cadastrar e Vincular'}
        </Button>
      </div>
    </div>
  );
}
