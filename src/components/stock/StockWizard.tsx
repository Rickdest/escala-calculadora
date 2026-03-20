import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Package, Layers, Plus, Camera } from 'lucide-react';
import { useEstoque, EstoqueProduto } from '@/hooks/useEstoque';
import { generateVariationCombinations, getVariationLabel, ProductAttribute } from '@/types/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveLocalStockImage, getLocalStockImage } from '@/hooks/useEstoque';
import { compressImage } from '@/lib/imageUtils';

const CATEGORIES = ['Moda', 'Calçados', 'Acessórios', 'Eletrônicos', 'Beleza', 'Casa e Decoração', 'Esporte', 'Alimentos', 'Outro'];

const VARIATION_TYPES: { key: string; label: string; presets: string[]; colors?: Record<string, string> }[] = [
  { key: 'Tamanho', label: 'Tamanho', presets: ['PP', 'P', 'M', 'G', 'GG', 'XG'] },
  { key: 'Cor', label: 'Cor', presets: ['Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde'], colors: { 'Preto': '⚫', 'Branco': '⚪', 'Azul': '🔵', 'Vermelho': '🔴', 'Rosa': '🟣', 'Verde': '🟢' } },
  { key: 'Modelo', label: 'Modelo', presets: [] },
  { key: 'Material', label: 'Material', presets: ['Algodão', 'Poliéster', 'Couro', 'Sintético'] },
  { key: 'Sabor', label: 'Sabor', presets: [] },
];

interface VarRow {
  tempId: string;
  atributos: Record<string, string>;
  sku: string;
  preco_custo: number;
  quantidade: number;
  quantidade_minima: number;
}

interface Props {
  onClose: () => void;
  editProduct?: EstoqueProduto | null;
}

export function StockWizard({ onClose, editProduct }: Props) {
  const { addProduto, updateProduto, updateVariacao } = useEstoque();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [nome, setNome] = useState(editProduct?.nome || '');
  const [categoria, setCategoria] = useState(editProduct?.categoria || '');
  const [skuBase, setSkuBase] = useState(editProduct?.sku_base || '');
  const [descricao, setDescricao] = useState(editProduct?.descricao || '');
  const [imagePreview, setImagePreview] = useState<string | null>(editProduct ? getLocalStockImage(editProduct.id) : null);
  const [showDesc, setShowDesc] = useState(!!editProduct?.descricao);

  // Step 2
  const [temVariacoes, setTemVariacoes] = useState(editProduct?.tem_variacoes || false);

  // Step 3
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [customName, setCustomName] = useState('');

  // Step 4
  const [varRows, setVarRows] = useState<VarRow[]>([]);
  const [simpleCost, setSimpleCost] = useState('');
  const [simpleQty, setSimpleQty] = useState('0');
  const [simpleMin, setSimpleMin] = useState('5');
  const [simpleSku, setSimpleSku] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [bulkQty, setBulkQty] = useState('');
  const [bulkMin, setBulkMin] = useState('5');
  const [showBulk, setShowBulk] = useState(false);

  // Init edit mode
  useEffect(() => {
    if (editProduct && editProduct.tem_variacoes && editProduct.variacoes.length > 0) {
      // Reconstruct attributes from variations
      const attrKeys = [...new Set(editProduct.variacoes.flatMap(v => Object.keys(v.atributos)))];
      const attrs: ProductAttribute[] = attrKeys.map(key => ({
        id: Math.random().toString(36).substring(2, 10),
        name: key,
        values: [...new Set(editProduct.variacoes.map(v => v.atributos[key]).filter(Boolean))],
      }));
      setAttributes(attrs);
      setVarRows(editProduct.variacoes.map(v => ({
        tempId: v.id,
        atributos: v.atributos,
        sku: v.sku || '',
        preco_custo: v.preco_custo,
        quantidade: v.quantidade,
        quantidade_minima: v.quantidade_minima,
      })));
    } else if (editProduct && !editProduct.tem_variacoes && editProduct.variacoes.length > 0) {
      const v = editProduct.variacoes[0];
      setSimpleCost(v.preco_custo.toString());
      setSimpleQty(v.quantidade.toString());
      setSimpleMin(v.quantidade_minima.toString());
      setSimpleSku(v.sku || '');
    }
  }, [editProduct]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string);
      setImagePreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const toggleAttrType = (key: string) => {
    const exists = attributes.find(a => a.name === key);
    if (exists) {
      setAttributes(prev => prev.filter(a => a.name !== key));
    } else {
      if (attributes.length >= 2) { toast.error('Máximo 2 tipos de variação'); return; }
      const preset = VARIATION_TYPES.find(v => v.key === key);
      setAttributes(prev => [...prev, { id: Math.random().toString(36).substring(2, 10), name: key, values: [] }]);
    }
  };

  const toggleAttrValue = (attrName: string, value: string) => {
    setAttributes(prev => prev.map(a => {
      if (a.name !== attrName) return a;
      return { ...a, values: a.values.includes(value) ? a.values.filter(v => v !== value) : [...a.values, value] };
    }));
  };

  const addCustomValue = (attrName: string, value: string) => {
    if (!value.trim()) return;
    setAttributes(prev => prev.map(a => {
      if (a.name !== attrName || a.values.includes(value.trim())) return a;
      return { ...a, values: [...a.values, value.trim()] };
    }));
  };

  const addCustomAttr = () => {
    if (!customName.trim()) return;
    if (attributes.length >= 2) { toast.error('Máximo 2 tipos de variação'); return; }
    setAttributes(prev => [...prev, { id: Math.random().toString(36).substring(2, 10), name: customName.trim(), values: [] }]);
    setCustomName('');
  };

  // Generate combinations when entering step 4
  useEffect(() => {
    if (step === 4 && temVariacoes) {
      const combos = generateVariationCombinations(attributes);
      const existingMap = new Map<string, VarRow>();
      for (const v of varRows) existingMap.set(getVariationLabel(v.atributos), v);
      const rows: VarRow[] = combos.map(combo => {
        const label = getVariationLabel(combo);
        const existing = existingMap.get(label);
        if (existing) return { ...existing, atributos: combo };
        return { tempId: Math.random().toString(36).substring(2, 15), atributos: combo, sku: '', preco_custo: 0, quantidade: 0, quantidade_minima: 5 };
      });
      setVarRows(rows);
    }
  }, [step]);

  const applyBulk = () => {
    setVarRows(prev => prev.map(v => ({
      ...v,
      preco_custo: bulkCost ? parseFloat(bulkCost) : v.preco_custo,
      quantidade: bulkQty ? parseInt(bulkQty) : v.quantidade,
      quantidade_minima: bulkMin ? parseInt(bulkMin) : v.quantidade_minima,
    })));
    setShowBulk(false);
    toast.success('Valores aplicados');
  };

  const removeVarRow = (id: string) => {
    setVarRows(prev => prev.filter(v => v.tempId !== id));
  };

  const updateVarRow = (id: string, field: keyof VarRow, value: string) => {
    setVarRows(prev => prev.map(v => {
      if (v.tempId !== id) return v;
      if (field === 'preco_custo') return { ...v, preco_custo: parseFloat(value) || 0 };
      if (field === 'quantidade') return { ...v, quantidade: Math.max(0, parseInt(value) || 0) };
      if (field === 'quantidade_minima') return { ...v, quantidade_minima: Math.max(0, parseInt(value) || 0) };
      if (field === 'sku') return { ...v, sku: value };
      return v;
    }));
  };

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      if (editProduct) {
        await updateProduto(editProduct.id, { nome, categoria: categoria || null, sku_base: skuBase || null, descricao: descricao || null, tem_variacoes: temVariacoes });
        if (imagePreview) saveLocalStockImage(editProduct.id, imagePreview);
        // TODO: update variations in edit mode would require delete+reinsert
        toast.success('Produto atualizado!');
      } else {
        const variacoes = temVariacoes
          ? varRows.map(v => ({ atributos: v.atributos, sku: v.sku || null, preco_custo: v.preco_custo, quantidade: v.quantidade, quantidade_minima: v.quantidade_minima }))
          : [{ atributos: {}, sku: simpleSku || null, preco_custo: parseFloat(simpleCost) || 0, quantidade: parseInt(simpleQty) || 0, quantidade_minima: parseInt(simpleMin) || 5 }];

        const prod = await addProduto({ nome, categoria, sku_base: skuBase, descricao, tem_variacoes: temVariacoes, imageDataUrl: imagePreview || undefined, variacoes });
      }
      onClose();
    } catch {
      // error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return !!nome.trim();
    if (step === 3) return attributes.some(a => a.values.length > 0);
    return true;
  };

  const goNext = () => {
    if (step === 2 && !temVariacoes) setStep(4);
    else setStep(s => s + 1);
  };
  const goBack = () => {
    if (step === 4 && !temVariacoes) setStep(2);
    else setStep(s => s - 1);
  };

  const totalSteps = temVariacoes ? 4 : 3;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm">
      <div className="fixed inset-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:my-4 bg-card md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={goBack} className="p-1.5 hover:bg-secondary rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            )}
            <div>
              <h2 className="text-base font-bold">{editProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={cn('h-1 rounded-full transition-all', i < step ? 'bg-primary' : 'bg-border', i === step - 1 ? 'w-6' : 'w-3')} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Image upload */}
              <div className="flex justify-center">
                <button onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 overflow-hidden transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Adicionar foto</span>
                    </>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do produto <span className="text-destructive">*</span></Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Camiseta Oversized" className="h-10 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria <span className="text-destructive">*</span></Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SKU <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input value={skuBase} onChange={e => setSkuBase(e.target.value)} placeholder="Ex: CAM-001" className="h-10 text-sm" />
              </div>

              <div>
                <button onClick={() => setShowDesc(!showDesc)} className="text-xs text-primary font-semibold">
                  {showDesc ? '− Ocultar descrição' : '+ Adicionar descrição'}
                </button>
                {showDesc && (
                  <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do produto..." className="mt-2 text-sm min-h-[60px]" />
                )}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold">Este produto possui variações?</h3>
                <p className="text-sm text-muted-foreground mt-1">Ex: Tamanho e Cor</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setTemVariacoes(true)} className={cn(
                  'rounded-xl border-2 p-5 flex flex-col items-center gap-2 transition-all',
                  temVariacoes ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                )}>
                  <Layers className={cn('w-8 h-8', temVariacoes ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="font-bold text-sm">✅ Sim</p>
                  <p className="text-[10px] text-muted-foreground">Tamanho, Cor...</p>
                </button>
                <button onClick={() => setTemVariacoes(false)} className={cn(
                  'rounded-xl border-2 p-5 flex flex-col items-center gap-2 transition-all',
                  !temVariacoes ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                )}>
                  <Package className={cn('w-8 h-8', !temVariacoes ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="font-bold text-sm">➡️ Não</p>
                  <p className="text-[10px] text-muted-foreground">Produto simples</p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Variation config */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold">Selecione os tipos de variação</h3>
                <p className="text-xs text-muted-foreground mt-1">Máximo 2 tipos (ex: Tamanho + Cor)</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {VARIATION_TYPES.map(vt => {
                  const isActive = attributes.some(a => a.name === vt.key);
                  return (
                    <button key={vt.key} onClick={() => toggleAttrType(vt.key)} className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                      isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                    )}>
                      {vt.label}
                    </button>
                  );
                })}
                {/* Custom */}
                <div className="flex gap-1">
                  <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="+ Personalizado" className="h-8 w-28 text-xs" />
                  {customName && <button onClick={addCustomAttr} className="px-2 h-8 bg-primary text-primary-foreground rounded-lg text-xs font-bold">+</button>}
                </div>
              </div>

              {/* Value chips per attribute */}
              {attributes.map(attr => {
                const vt = VARIATION_TYPES.find(v => v.key === attr.name);
                const presets = vt?.presets || [];
                const colors = vt?.colors || {};
                return (
                  <div key={attr.id} className="border border-border/50 rounded-xl p-3 space-y-2">
                    <p className="text-sm font-bold">{attr.name}</p>
                    {presets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {presets.map(val => {
                          const sel = attr.values.includes(val);
                          return (
                            <button key={val} onClick={() => toggleAttrValue(attr.name, val)} className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                              sel ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border/50'
                            )}>
                              {colors[val] ? `${colors[val]} ` : ''}{val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <Input placeholder={`+ Outro ${attr.name.toLowerCase()}`} className="h-8 text-xs" onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addCustomValue(attr.name, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; }
                    }} />
                    {/* Show custom values */}
                    {attr.values.filter(v => !presets.includes(v)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {attr.values.filter(v => !presets.includes(v)).map(val => (
                          <button key={val} onClick={() => toggleAttrValue(attr.name, val)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                            ✓ {val}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {attributes.some(a => a.values.length > 0) && (
                <p className="text-xs text-muted-foreground">
                  {generateVariationCombinations(attributes).length} combinações serão geradas
                </p>
              )}
            </div>
          )}

          {/* STEP 4 — Stock */}
          {step === (temVariacoes ? 4 : 3) && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Defina o estoque inicial</h3>

              {!temVariacoes ? (
                /* Simple product */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preço de Custo (R$)</Label>
                    <Input type="number" step="0.01" value={simpleCost} onChange={e => setSimpleCost(e.target.value)} placeholder="0,00" className="h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Quantidade</Label>
                      <Input type="number" min="0" value={simpleQty} onChange={e => setSimpleQty(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Mínimo alerta</Label>
                      <Input type="number" min="0" value={simpleMin} onChange={e => setSimpleMin(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">SKU <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input value={simpleSku} onChange={e => setSimpleSku(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              ) : (
                /* Variations table */
                <div className="space-y-3">
                  <button onClick={() => setShowBulk(!showBulk)} className="text-xs text-primary font-semibold">
                    {showBulk ? '− Ocultar' : 'Preencher todos igual →'}
                  </button>

                  {showBulk && (
                    <div className="border border-border/50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-[10px]">Custo</Label><Input type="number" step="0.01" value={bulkCost} onChange={e => setBulkCost(e.target.value)} className="h-8 text-xs" /></div>
                        <div><Label className="text-[10px]">Qtd</Label><Input type="number" value={bulkQty} onChange={e => setBulkQty(e.target.value)} className="h-8 text-xs" /></div>
                        <div><Label className="text-[10px]">Mín</Label><Input type="number" value={bulkMin} onChange={e => setBulkMin(e.target.value)} className="h-8 text-xs" /></div>
                      </div>
                      <Button onClick={applyBulk} size="sm" className="w-full gradient-primary text-xs h-8">Aplicar para todas</Button>
                    </div>
                  )}

                  {/* Table */}
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_70px_50px_50px_60px_28px] gap-0 bg-secondary/50 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <span>Variação</span><span>Custo</span><span>Qtd</span><span>Mín</span><span>SKU</span><span></span>
                    </div>
                    <div className="divide-y divide-border/30 max-h-[40vh] overflow-y-auto">
                      {varRows.map(row => (
                        <div key={row.tempId} className="grid grid-cols-[1fr_70px_50px_50px_60px_28px] gap-0 px-2 py-1.5 items-center">
                          <span className="text-xs font-medium truncate pr-1">{getVariationLabel(row.atributos)}</span>
                          <Input type="number" step="0.01" value={row.preco_custo || ''} onChange={e => updateVarRow(row.tempId, 'preco_custo', e.target.value)} className="h-[36px] text-xs px-1 border-border/50" />
                          <Input type="number" min="0" value={row.quantidade || ''} onChange={e => updateVarRow(row.tempId, 'quantidade', e.target.value)} className="h-[36px] text-xs px-1 border-border/50" />
                          <Input type="number" min="0" value={row.quantidade_minima || ''} onChange={e => updateVarRow(row.tempId, 'quantidade_minima', e.target.value)} className="h-[36px] text-xs px-1 border-border/50" />
                          <Input value={row.sku} onChange={e => updateVarRow(row.tempId, 'sku', e.target.value)} className="h-[36px] text-xs px-1 border-border/50" />
                          <button onClick={() => removeVarRow(row.tempId)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          {step < (temVariacoes ? 4 : 3) ? (
            <Button onClick={goNext} disabled={!canAdvance()} className="w-full gradient-primary font-bold h-11">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving || !nome.trim()} className="w-full gradient-primary font-bold h-11">
              {saving ? 'Salvando...' : '✓ Salvar Produto'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
