import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Package, Layers, Plus } from 'lucide-react';
import { Product, ProductAttribute, ProductVariation, generateVariationCombinations, getVariationLabel, ATTRIBUTE_PRESETS } from '@/types/store';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const STOCK_CATEGORIES = [
  'Roupas', 'Calçados', 'Acessórios', 'Eletrônicos', 'Beleza', 'Casa', 'Outro',
] as const;

export type StockCategory = typeof STOCK_CATEGORIES[number];

const VARIATION_TYPES: { key: string; label: string; presets: string[] }[] = [
  { key: 'Tamanho', label: 'Tamanho', presets: ['PP', 'P', 'M', 'G', 'GG', 'XG'] },
  { key: 'Cor', label: 'Cor', presets: ['Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde'] },
  { key: 'Modelo', label: 'Modelo', presets: [] },
  { key: 'Material', label: 'Material', presets: ['Algodão', 'Poliéster', 'Couro', 'Sintético'] },
  { key: 'Sabor', label: 'Sabor', presets: [] },
  { key: 'Peso', label: 'Peso', presets: [] },
];

interface Props {
  onClose: () => void;
  editProduct?: Product | null;
}

export function StockProductWizard({ onClose, editProduct }: Props) {
  const { currentStore, addProduct, updateProduct } = useStore();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 fields
  const [name, setName] = useState(editProduct?.name || '');
  const [category, setCategory] = useState<string>(editProduct?.category || '');
  const [skuBase, setSkuBase] = useState('');
  const [description, setDescription] = useState(editProduct?.description || '');

  // Step 2
  const [hasVariations, setHasVariations] = useState(editProduct?.hasVariations || false);

  // Step 3
  const [attributes, setAttributes] = useState<ProductAttribute[]>(editProduct?.attributes || []);
  const [customAttrName, setCustomAttrName] = useState('');
  const [customAttrValues, setCustomAttrValues] = useState('');

  // Step 4
  const [variations, setVariations] = useState<ProductVariation[]>(editProduct?.variations || []);
  const [simpleCost, setSimpleCost] = useState(editProduct?.costPrice?.toString() || '');
  const [simpleQty, setSimpleQty] = useState(editProduct?.stockQuantity?.toString() || '0');
  const [simpleMin, setSimpleMin] = useState(editProduct?.minStockQuantity?.toString() || '5');
  const [simpleSku, setSimpleSku] = useState('');

  // Bulk apply for variations
  const [bulkCost, setBulkCost] = useState('');
  const [bulkQty, setBulkQty] = useState('');
  const [bulkMin, setBulkMin] = useState('5');

  const toggleAttrType = (key: string) => {
    const exists = attributes.find(a => a.name === key);
    if (exists) {
      setAttributes(prev => prev.filter(a => a.name !== key));
    } else {
      const preset = VARIATION_TYPES.find(v => v.key === key);
      setAttributes(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 10),
        name: key,
        values: preset?.presets || [],
      }]);
    }
  };

  const toggleAttrValue = (attrName: string, value: string) => {
    setAttributes(prev => prev.map(a => {
      if (a.name !== attrName) return a;
      const has = a.values.includes(value);
      return { ...a, values: has ? a.values.filter(v => v !== value) : [...a.values, value] };
    }));
  };

  const addCustomValue = (attrName: string, value: string) => {
    if (!value.trim()) return;
    setAttributes(prev => prev.map(a => {
      if (a.name !== attrName) return a;
      if (a.values.includes(value.trim())) return a;
      return { ...a, values: [...a.values, value.trim()] };
    }));
  };

  const addCustomAttribute = () => {
    if (!customAttrName.trim()) return;
    const vals = customAttrValues.split(',').map(v => v.trim()).filter(Boolean);
    setAttributes(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 10),
      name: customAttrName.trim(),
      values: vals,
    }]);
    setCustomAttrName('');
    setCustomAttrValues('');
  };

  // Generate variations when going from step 3 to 4
  useEffect(() => {
    if (step === 4 && hasVariations) {
      const combos = generateVariationCombinations(attributes);
      const existingMap = new Map<string, ProductVariation>();
      for (const v of variations) {
        existingMap.set(getVariationLabel(v.attributes), v);
      }
      const newVars: ProductVariation[] = combos.map(combo => {
        const label = getVariationLabel(combo);
        const existing = existingMap.get(label);
        if (existing) return { ...existing, attributes: combo };
        return {
          id: Math.random().toString(36).substring(2, 15),
          attributes: combo,
          sku: '',
          costPrice: parseFloat(simpleCost) || editProduct?.costPrice || 0,
          salePrice: editProduct?.salePrice || 0,
          stockQuantity: 0,
          minStockQuantity: 5,
        };
      });
      setVariations(newVars);
    }
  }, [step]);

  const applyBulk = () => {
    setVariations(prev => prev.map(v => ({
      ...v,
      costPrice: bulkCost ? parseFloat(bulkCost) : v.costPrice,
      stockQuantity: bulkQty ? parseInt(bulkQty) : v.stockQuantity,
      minStockQuantity: bulkMin ? parseInt(bulkMin) : (v as any).minStockQuantity || 5,
    })));
    toast.success('Valores aplicados a todas as variações');
  };

  const updateVariation = (id: string, field: string, value: string) => {
    setVariations(prev => prev.map(v => {
      if (v.id !== id) return v;
      if (field === 'costPrice') return { ...v, costPrice: parseFloat(value) || 0 };
      if (field === 'stockQuantity') return { ...v, stockQuantity: Math.max(0, parseInt(value) || 0) };
      if (field === 'minStockQuantity') return { ...v, [field]: Math.max(0, parseInt(value) || 0) };
      if (field === 'sku') return { ...v, sku: value };
      return v;
    }));
  };

  const handleSave = async () => {
    if (!currentStore || !name) return;
    setIsSaving(true);
    try {
      const totalStock = hasVariations
        ? variations.reduce((sum, v) => sum + v.stockQuantity, 0)
        : parseInt(simpleQty) || 0;

      const productData: any = {
        storeId: currentStore.id,
        name,
        category: category || null,
        description: description || null,
        costPrice: hasVariations
          ? (variations[0]?.costPrice || 0)
          : (parseFloat(simpleCost) || 0),
        salePrice: editProduct?.salePrice || 0,
        packagingCost: editProduct?.packagingCost || 0,
        adsCost: editProduct?.adsCost || 0,
        stockQuantity: totalStock,
        hasVariations,
        attributes: hasVariations ? attributes : [],
        variations: hasVariations ? variations : [],
        minStockQuantity: hasVariations ? 5 : (parseInt(simpleMin) || 5),
        shopeeAcelera: editProduct?.shopeeAcelera || 'none',
      };

      if (editProduct) {
        await updateProduct(editProduct.id, productData);
        toast.success('Produto atualizado!');
      } else {
        await addProduct(productData);
        toast.success('Produto adicionado ao estoque!');
      }
      onClose();
    } catch {
      toast.error('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return !!name.trim();
    if (step === 3) return attributes.some(a => a.values.length > 0);
    return true;
  };

  const goNext = () => {
    if (step === 2 && !hasVariations) {
      setStep(4);
    } else {
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    if (step === 4 && !hasVariations) {
      setStep(2);
    } else {
      setStep(s => s - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm animate-fade-up">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold">{editProduct ? 'Editar Produto' : 'Adicionar ao Estoque'}</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={cn(
                  'h-1.5 rounded-full transition-all',
                  s <= step ? 'bg-primary' : 'bg-border',
                  s === step ? 'w-8' : 'w-4',
                  (!hasVariations && s === 3) && 'hidden'
                )} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-secondary rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP 1 — Basic Info */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Informações do Produto</h3>
                <p className="text-sm text-muted-foreground">Dados básicos para identificar o produto</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Nome do produto <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Camiseta Oversized" className="input-modern h-12" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 input-modern">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">SKU base <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input value={skuBase} onChange={e => setSkuBase(e.target.value)} placeholder="Ex: CAM-001" className="input-modern h-12" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do produto..." className="input-modern min-h-[80px]" />
              </div>
            </div>
          )}

          {/* STEP 2 — Has Variations? */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Este produto tem variações?</h3>
                <p className="text-sm text-muted-foreground">Variações como tamanho, cor, modelo, etc.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setHasVariations(true)}
                  className={cn(
                    'rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all',
                    hasVariations
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', hasVariations ? 'bg-primary/10' : 'bg-secondary')}>
                    <Layers className={cn('w-7 h-7', hasVariations ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground">✅ Sim</p>
                    <p className="text-xs text-muted-foreground mt-1">Tamanho, Cor...</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHasVariations(false)}
                  className={cn(
                    'rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all',
                    !hasVariations
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', !hasVariations ? 'bg-primary/10' : 'bg-secondary')}>
                    <Package className={cn('w-7 h-7', !hasVariations ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground">➡️ Não</p>
                    <p className="text-xs text-muted-foreground mt-1">Produto simples</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Configure Variations */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Configure as variações</h3>
                <p className="text-sm text-muted-foreground">Selecione os tipos de variação e marque os valores</p>
              </div>

              {/* Variation type chips */}
              <div className="flex flex-wrap gap-2">
                {VARIATION_TYPES.map(vt => {
                  const isActive = attributes.some(a => a.name === vt.key);
                  return (
                    <button
                      key={vt.key}
                      type="button"
                      onClick={() => toggleAttrType(vt.key)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {vt.label}
                    </button>
                  );
                })}
              </div>

              {/* Active attributes with value chips */}
              {attributes.map(attr => {
                const preset = VARIATION_TYPES.find(v => v.key === attr.name);
                const allPresets = preset?.presets || [];
                return (
                  <div key={attr.id} className="glass-card p-4 space-y-3">
                    <p className="text-sm font-bold text-foreground">{attr.name}</p>
                    {allPresets.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {allPresets.map(val => {
                          const isSelected = attr.values.includes(val);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => toggleAttrValue(attr.name, val)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                                isSelected
                                  ? 'bg-primary/10 text-primary border border-primary/30'
                                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80 border border-transparent'
                              )}
                            >
                              {isSelected && '✓ '}{val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Add custom value */}
                    <div className="flex gap-2">
                      <Input
                        placeholder={`+ Outro ${attr.name.toLowerCase()}`}
                        className="h-9 text-sm input-modern"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomValue(attr.name, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    {/* Show custom values not in presets */}
                    {attr.values.filter(v => !allPresets.includes(v)).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attr.values.filter(v => !allPresets.includes(v)).map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => toggleAttrValue(attr.name, val)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30"
                          >
                            ✓ {val} ×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Custom attribute */}
              <div className="glass-card p-4 space-y-3">
                <p className="text-sm font-bold text-foreground">+ Personalizado</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={customAttrName} onChange={e => setCustomAttrName(e.target.value)} placeholder="Nome (ex: Voltagem)" className="h-9 text-sm input-modern" />
                  <Input value={customAttrValues} onChange={e => setCustomAttrValues(e.target.value)} placeholder="Valores (ex: 110V, 220V)" className="h-9 text-sm input-modern" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCustomAttribute} disabled={!customAttrName.trim()}>
                  Adicionar atributo
                </Button>
              </div>

              {attributes.some(a => a.values.length > 0) && (
                <div className="glass-card p-3 bg-primary/5 border-primary/20">
                  <p className="text-sm font-semibold text-primary">
                    {generateVariationCombinations(attributes).length} combinações serão geradas
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Stock */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Defina o estoque inicial</h3>
                <p className="text-sm text-muted-foreground">
                  {hasVariations ? 'Configure custo e quantidade para cada variação' : 'Configure o estoque do produto'}
                </p>
              </div>

              {!hasVariations ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Preço de Custo (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input type="number" step="0.01" min="0" value={simpleCost} onChange={e => setSimpleCost(e.target.value)} placeholder="0,00" className="pl-12 input-modern h-12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Quantidade</Label>
                      <Input type="number" min="0" value={simpleQty} onChange={e => setSimpleQty(e.target.value)} placeholder="0" className="input-modern h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Qtd mínima p/ alerta</Label>
                      <Input type="number" min="0" value={simpleMin} onChange={e => setSimpleMin(e.target.value)} placeholder="5" className="input-modern h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">SKU <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input value={simpleSku} onChange={e => setSimpleSku(e.target.value)} placeholder="Ex: CAM-001" className="input-modern h-12" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk apply */}
                  <div className="glass-card p-4 space-y-3">
                    <p className="text-sm font-bold text-foreground">Aplicar mesmo valor para todas</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Custo (R$)</Label>
                        <Input type="number" step="0.01" value={bulkCost} onChange={e => setBulkCost(e.target.value)} placeholder="0,00" className="h-9 text-sm input-modern" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Qtd</Label>
                        <Input type="number" min="0" value={bulkQty} onChange={e => setBulkQty(e.target.value)} placeholder="0" className="h-9 text-sm input-modern" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mín</Label>
                        <Input type="number" min="0" value={bulkMin} onChange={e => setBulkMin(e.target.value)} placeholder="5" className="h-9 text-sm input-modern" />
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={applyBulk} className="w-full">
                      Aplicar para todas
                    </Button>
                  </div>

                  {/* Variations table */}
                  <div className="space-y-2">
                    {variations.map(v => {
                      const label = getVariationLabel(v.attributes);
                      return (
                        <div key={v.id} className="glass-card p-3 space-y-2">
                          <p className="text-sm font-bold text-foreground">{label}</p>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Custo R$</Label>
                              <Input type="number" step="0.01" value={v.costPrice || ''} onChange={e => updateVariation(v.id, 'costPrice', e.target.value)} className="h-8 text-xs input-modern" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                              <Input type="number" min="0" value={v.stockQuantity} onChange={e => updateVariation(v.id, 'stockQuantity', e.target.value)} className="h-8 text-xs input-modern" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Mín</Label>
                              <Input type="number" min="0" value={(v as any).minStockQuantity || 5} onChange={e => updateVariation(v.id, 'minStockQuantity', e.target.value)} className="h-8 text-xs input-modern" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">SKU</Label>
                              <Input value={v.sku || ''} onChange={e => updateVariation(v.id, 'sku', e.target.value)} className="h-8 text-xs input-modern" placeholder="—" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/50 safe-bottom bg-card flex gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={goBack} className="h-14 px-6">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Voltar
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canAdvance()}
              className="flex-1 h-14 text-base font-bold gradient-primary hover:opacity-90 transition-opacity"
            >
              Próximo
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-14 text-base font-bold gradient-primary hover:opacity-90 transition-opacity"
            >
              {isSaving ? 'Salvando...' : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Salvar produto no estoque
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
