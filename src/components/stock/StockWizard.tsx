import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Camera, Trash2, GripVertical, Plus, Package, FileDown, PenLine, Search, ChevronRight } from 'lucide-react';
import { useEstoque, EstoqueProduto } from '@/hooks/useEstoque';
import { useStore } from '@/contexts/StoreContext';
import { Product } from '@/types/store';
import { generateVariationCombinations, getVariationLabel, ProductAttribute } from '@/types/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveLocalStockImage, getLocalStockImage } from '@/hooks/useEstoque';
import { compressImage } from '@/lib/imageUtils';

const CATEGORIES = ['Moda', 'Calçados', 'Acessórios', 'Eletrônicos', 'Beleza', 'Casa e Decoração', 'Esporte', 'Alimentos', 'Outro'];

const VARIATION_SUGGESTIONS = ['Cor', 'Tamanho', 'Modelo', 'Material', 'Volume', 'Sabor'];

interface VariationOption {
  value: string;
  explanation: string;
}

interface VariationBlock {
  id: string;
  typeName: string;
  options: VariationOption[];
}

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
  const { currentStore } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const editInitRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'choose' | 'form'>(editProduct ? 'form' : 'choose');
  const [importSearch, setImportSearch] = useState('');

  // Basic info
  const [nome, setNome] = useState(editProduct?.nome || '');
  const [categoria, setCategoria] = useState(editProduct?.categoria || '');
  const [skuBase, setSkuBase] = useState(editProduct?.sku_base || '');
  const [descricao, setDescricao] = useState(editProduct?.descricao || '');
  const [imagePreview, setImagePreview] = useState<string | null>(editProduct ? getLocalStockImage(editProduct.id) : null);
  const [showDesc, setShowDesc] = useState(!!editProduct?.descricao);

  // Variations
  const [temVariacoes, setTemVariacoes] = useState(editProduct?.tem_variacoes || false);
  const [variationBlocks, setVariationBlocks] = useState<VariationBlock[]>([]);
  const [varRows, setVarRows] = useState<VarRow[]>([]);

  // Simple product fields
  const [simpleCost, setSimpleCost] = useState('');
  const [simpleQty, setSimpleQty] = useState('0');
  const [simpleMin, setSimpleMin] = useState('5');
  const [simpleSku, setSimpleSku] = useState('');

  // Bulk apply
  const [bulkCost, setBulkCost] = useState('');
  const [bulkQty, setBulkQty] = useState('');
  const [bulkMin, setBulkMin] = useState('');
  const [bulkSku, setBulkSku] = useState('');

  // Dropdown state for type name inputs
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Group images for variation1 values
  const [groupImages, setGroupImages] = useState<Record<string, string>>({});
  const groupFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Init edit mode
  useEffect(() => {
    if (editProduct && editProduct.tem_variacoes && editProduct.variacoes.length > 0) {
      editInitRef.current = true;
      const attrKeys = [...new Set(editProduct.variacoes.flatMap(v => Object.keys(v.atributos)))];
      const blocks: VariationBlock[] = attrKeys.map(key => ({
        id: Math.random().toString(36).substring(2, 10),
        typeName: key,
        options: [...new Set(editProduct.variacoes.map(v => v.atributos[key]).filter(Boolean))].map(val => ({ value: val, explanation: '' })),
      }));
      setVariationBlocks(blocks);
      setVarRows(editProduct.variacoes.map(v => ({
        tempId: v.id,
        atributos: v.atributos as Record<string, string>,
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

  // Convert blocks to ProductAttribute[] for combination generation
  const attributes: ProductAttribute[] = useMemo(() =>
    variationBlocks.filter(b => b.typeName && b.options.some(o => o.value)).map(b => ({
      id: b.id,
      name: b.typeName,
      values: b.options.filter(o => o.value).map(o => o.value),
    })),
    [variationBlocks]
  );

  // Auto-regenerate combinations (skip first run when editing to preserve loaded data)
  useEffect(() => {
    if (!temVariacoes) return;
    if (editInitRef.current) {
      editInitRef.current = false;
      return;
    }
    const combos = generateVariationCombinations(attributes);
    if (combos.length === 0) { setVarRows([]); return; }

    // Build lookup from current varRows by label
    const existingMap = new Map<string, VarRow>();
    for (const v of varRows) existingMap.set(getVariationLabel(v.atributos), v);

    // Also build lookup from editProduct variacoes to recover real DB IDs
    const dbMap = new Map<string, string>();
    if (editProduct?.variacoes) {
      for (const v of editProduct.variacoes) {
        dbMap.set(getVariationLabel(v.atributos as Record<string, string>), v.id);
      }
    }

    const rows: VarRow[] = combos.map(combo => {
      const label = getVariationLabel(combo);
      const existing = existingMap.get(label);
      if (existing) return { ...existing, atributos: combo };
      // Try to recover DB ID for this combo
      const dbId = dbMap.get(label);
      return { tempId: dbId || Math.random().toString(36).substring(2, 15), atributos: combo, sku: '', preco_custo: 0, quantidade: 0, quantidade_minima: 5 };
    });
    setVarRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temVariacoes, attributes]);

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

  const handleGroupImageSelect = async (groupValue: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string);
      setGroupImages(prev => ({ ...prev, [groupValue]: compressed }));
    };
    reader.readAsDataURL(file);
  };

  // Variation block helpers
  const updateBlock = (blockId: string, updates: Partial<VariationBlock>) => {
    setVariationBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
  };

  const removeBlock = (blockId: string) => {
    setVariationBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const addOptionToBlock = (blockId: string, value: string) => {
    if (!value.trim()) return;
    setVariationBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      if (b.options.some(o => o.value === value.trim())) return b;
      return { ...b, options: [...b.options, { value: value.trim(), explanation: '' }] };
    }));
  };

  const removeOptionFromBlock = (blockId: string, index: number) => {
    setVariationBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, options: b.options.filter((_, i) => i !== index) };
    }));
  };

  const updateOptionInBlock = (blockId: string, index: number, updates: Partial<VariationOption>) => {
    setVariationBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const opts = [...b.options];
      opts[index] = { ...opts[index], ...updates };
      return { ...b, options: opts };
    }));
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

  const removeVarRow = (id: string) => {
    setVarRows(prev => prev.filter(v => v.tempId !== id));
  };

  const applyBulk = () => {
    setVarRows(prev => prev.map(v => ({
      ...v,
      preco_custo: bulkCost ? parseFloat(bulkCost) : v.preco_custo,
      quantidade: bulkQty ? parseInt(bulkQty) : v.quantidade,
      quantidade_minima: bulkMin ? parseInt(bulkMin) : v.quantidade_minima,
      sku: bulkSku ? bulkSku : v.sku,
    })));
    toast.success('Valores aplicados');
  };

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      if (editProduct) {
        // Update basic product info
        await updateProduto(editProduct.id, {
          nome,
          categoria: categoria || null,
          sku_base: skuBase || null,
          descricao: descricao || null,
          tem_variacoes: temVariacoes,
        });

        if (imagePreview) saveLocalStockImage(editProduct.id, imagePreview);

        // Update each existing variation
        if (temVariacoes) {
          for (const row of varRows) {
            let existing = editProduct.variacoes.find(v => v.id === row.tempId);
            if (!existing) {
              // Fallback: match by atributos content
              existing = editProduct.variacoes.find(v =>
                getVariationLabel(v.atributos as Record<string, string>) === getVariationLabel(row.atributos)
              );
            }
            if (existing) {
              await updateVariacao(existing.id, {
                preco_custo: row.preco_custo,
                quantidade: row.quantidade,
                quantidade_minima: row.quantidade_minima,
                sku: row.sku || null,
                atributos: row.atributos,
              });
            }
          }
        } else {
          // Simple product — update single variation
          const singleVar = editProduct.variacoes[0];
          if (singleVar) {
            await updateVariacao(singleVar.id, {
              preco_custo: parseFloat(simpleCost) || 0,
              quantidade: parseInt(simpleQty) || 0,
              quantidade_minima: parseInt(simpleMin) || 5,
              sku: simpleSku || null,
            });
          }
        }

        toast.success('Produto atualizado!');
      } else {
        const variacoes = temVariacoes
          ? varRows.map(v => ({ atributos: v.atributos, sku: v.sku || null, preco_custo: v.preco_custo, quantidade: v.quantidade, quantidade_minima: v.quantidade_minima }))
          : [{ atributos: {}, sku: simpleSku || null, preco_custo: parseFloat(simpleCost) || 0, quantidade: parseInt(simpleQty) || 0, quantidade_minima: parseInt(simpleMin) || 5 }];
        await addProduto({ nome, categoria, sku_base: skuBase, descricao, tem_variacoes: temVariacoes, imageDataUrl: imagePreview || undefined, variacoes });
      }
      onClose();
    } catch {
      // error handled in hook
    } finally {
      setSaving(false);
    }
  };

  // Grouped rows for table
  const groupedRows = useMemo(() => {
    if (attributes.length === 0) return [];
    const var1Name = attributes[0]?.name;
    if (!var1Name) return [];
    const groups: { key: string; rows: VarRow[] }[] = [];
    const map = new Map<string, VarRow[]>();
    for (const row of varRows) {
      const key = row.atributos[var1Name] || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    for (const [key, rows] of map) groups.push({ key, rows });
    return groups;
  }, [varRows, attributes]);

  const hasVar2 = attributes.length >= 2;
  const var1Name = attributes[0]?.name || '';
  const var2Name = attributes[1]?.name || '';

  const filteredSuggestions = (blockId: string, query: string) => {
    const usedNames = variationBlocks.filter(b => b.id !== blockId).map(b => b.typeName);
    return VARIATION_SUGGESTIONS.filter(s =>
      !usedNames.includes(s) && s.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleImportProduct = (product: Product) => {
    setNome(product.name);
    setCategoria(product.category || '');
    if (product.hasVariations && product.attributes.length > 0) {
      setTemVariacoes(true);
      const blocks: VariationBlock[] = product.attributes.map(attr => ({
        id: Math.random().toString(36).substring(2, 10),
        typeName: attr.name,
        options: attr.values.map(v => ({ value: v, explanation: '' })),
      }));
      setVariationBlocks(blocks);
    }
    setStep('form');
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm">
      <div className="fixed inset-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:my-4 bg-surface md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <button onClick={step === 'form' && !editProduct ? () => setStep('choose') : onClose} className="p-1.5 hover:bg-surface-2/80 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold">{editProduct ? 'Editar Produto' : step === 'choose' ? 'Novo Produto' : 'Novo Produto'}</h2>
          {step === 'form' ? (
            <button
              onClick={handleSave}
              disabled={!nome.trim() || saving}
              className={cn(
                'px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all',
                nome.trim() && !saving
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {saving ? '...' : 'Salvar'}
            </button>
          ) : <div className="w-16" />}
        </div>

        {/* ═══ STEP ZERO: Choose mode ═══ */}
        {step === 'choose' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4 animate-fade-up">

              <p className="text-[13px] text-text-3 mt-1 mb-3">Adicionar ao estoque:</p>

              {/* Cadastrar do zero */}
              <button
                onClick={() => setStep('form')}
                className="w-full flex items-center gap-3 h-12 px-4 rounded-xl hover:brightness-110 transition-all active:scale-[0.98]"
                style={{ backgroundColor: '#F97316' }}
              >
                <Plus className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-sm font-bold text-white flex-1 text-left">Cadastrar do zero</span>
                <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
              </button>

              {currentStore && currentStore.products.length > 0 && (
                <>
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[11px] text-text-3">ou importar produto cadastrado</span>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-3" />
                    <input
                      type="text"
                      value={importSearch}
                      onChange={e => setImportSearch(e.target.value)}
                      placeholder="Buscar produto..."
                      className="w-full h-10 pl-9 pr-3 bg-surface-2 border border-border rounded-[10px] text-[13px] text-foreground placeholder:text-text-2 outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="surface-card divide-y divide-border max-h-[360px] overflow-y-auto scrollbar-hide">
                    {currentStore.products
                      .filter(p => p.name.toLowerCase().includes(importSearch.toLowerCase()))
                      .map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleImportProduct(product)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center flex-shrink-0">
                          <span className="text-[13px] font-bold text-foreground">{product.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground flex-1 min-w-0 truncate">{product.name}</p>
                        <span className="text-[13px] text-text-3 font-mono font-mono-num flex-shrink-0">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.salePrice)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0" />
                      </button>
                    ))}
                    {currentStore.products.filter(p => p.name.toLowerCase().includes(importSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-sm text-text-3 py-8">Nenhum produto encontrado</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ SCROLLABLE CONTENT (form step) ═══ */}
        {step === 'form' && <div className="flex-1 overflow-y-auto pb-20">

          {/* ─── SEÇÃO: Informações Básicas ─── */}
          <div className="p-4 space-y-4 animate-fade-up">
            <h3 className="text-sm font-bold text-foreground">Informações Básicas</h3>

            {/* Photo */}
            <div className="flex items-start gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 shrink-0 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 overflow-hidden transition-colors bg-surface-2"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-text-3" />
                    <span className="text-[9px] text-text-3">Foto</span>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Produto <span className="text-destructive">*</span></Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Camiseta Oversized" className="h-10 text-sm bg-surface-2 border-border focus:border-primary" />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-10 text-sm bg-surface-2 border-border focus:border-primary"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* SKU Base */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">SKU Base <span className="text-text-3 font-normal">(opcional)</span></Label>
              <Input value={skuBase} onChange={e => setSkuBase(e.target.value)} placeholder="Ex: CAM-001" className="h-10 text-sm bg-surface-2 border-border focus:border-primary" />
            </div>

            {/* Descrição colapsável */}
            <div>
              <button onClick={() => setShowDesc(!showDesc)} className="text-xs text-primary font-semibold">
                {showDesc ? '− Ocultar descrição' : '+ Adicionar descrição'}
              </button>
              {showDesc && (
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do produto..." className="mt-2 text-sm min-h-[60px] bg-surface-2 border-border focus:border-primary" />
              )}
            </div>
          </div>

          <div className="h-2 bg-surface-2" />

          {/* ─── SEÇÃO: Informações de Vendas ─── */}
          <div className="p-4 space-y-4 animate-fade-up">
            <h3 className="text-sm font-bold text-foreground">Informações de vendas</h3>

            {/* Variações header */}
            <div className="flex items-center gap-2">
              <span className="text-primary text-lg leading-none">●</span>
              <span className="text-sm font-semibold">Variações</span>
            </div>

            {!temVariacoes ? (
              <>
                {/* Enable variations button */}
                <button
                  onClick={() => {
                    setTemVariacoes(true);
                    setVariationBlocks(prev => prev.length === 0
                      ? [{ id: Math.random().toString(36).substring(2, 10), typeName: '', options: [] }]
                      : prev
                    );
                  }}
                  className="w-full border-2 border-dashed border-primary/50 text-primary rounded-[10px] py-2.5 text-sm font-semibold hover:bg-primary/5 transition-colors"
                >
                  + Habilitar Variações
                </button>

                {/* Simple product fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preço de Custo <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-3">R$</span>
                      <Input type="number" step="0.01" value={simpleCost} onChange={e => setSimpleCost(e.target.value)} placeholder="0,00" className="h-10 text-sm pl-9 bg-surface-2 border-border focus:border-primary" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estoque <span className="text-destructive">*</span></Label>
                    <Input type="number" min="0" value={simpleQty} onChange={e => setSimpleQty(e.target.value)} className="h-10 text-sm bg-surface-2 border-border focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estoque mínimo para alerta</Label>
                    <Input type="number" min="0" value={simpleMin} onChange={e => setSimpleMin(e.target.value)} className="h-10 text-sm bg-surface-2 border-border focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">SKU <span className="text-text-3 font-normal">(opcional)</span></Label>
                    <Input value={simpleSku} onChange={e => setSimpleSku(e.target.value)} className="h-10 text-sm bg-surface-2 border-border focus:border-primary" />
                  </div>
                </div>
              </>
            ) : (
              /* ─── Variation blocks ─── */
              <div className="space-y-4">
                {variationBlocks.map((block, blockIdx) => (
                  <VariationBlockUI
                    key={block.id}
                    block={block}
                    blockIdx={blockIdx}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    filteredSuggestions={filteredSuggestions}
                    updateBlock={updateBlock}
                    removeBlock={removeBlock}
                    addOptionToBlock={addOptionToBlock}
                    removeOptionFromBlock={removeOptionFromBlock}
                    updateOptionInBlock={updateOptionInBlock}
                  />
                ))}

                {/* Add Variation2 button */}
                {variationBlocks.length === 1 && (
                  <button
                    onClick={() => {
                      if (variationBlocks.length >= 2) { toast.error('Máximo 2 variações'); return; }
                      setVariationBlocks(prev => [...prev, { id: Math.random().toString(36).substring(2, 10), typeName: '', options: [] }]);
                    }}
                    className="w-full border border-dashed border-primary/50 text-primary rounded-[10px] py-2 text-sm font-semibold hover:bg-primary/5 transition-colors"
                  >
                    + Adicionar Variação {variationBlocks.length + 1}
                  </button>
                )}

                {/* Disable variations link */}
                <button
                  onClick={() => { setTemVariacoes(false); setVariationBlocks([]); setVarRows([]); }}
                  className="text-xs text-text-2 hover:text-destructive"
                >
                  Desabilitar variações
                </button>
              </div>
            )}
          </div>

          {/* ─── SEÇÃO: Lista de Variações ─── */}
          {temVariacoes && varRows.length > 0 && (
            <>
              <div className="h-2 bg-surface-2" />
              <div className="p-4 space-y-3 animate-fade-up">

                {/* Bulk fill card */}
                <div className="surface-card p-3 space-y-3">
                  <p className="section-label">Preencher todos igual</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="section-label mb-1">CUSTO (R$)</p>
                      <Input type="number" step="0.01" value={bulkCost} onChange={e => setBulkCost(e.target.value)} placeholder="0,00" className="h-10 bg-surface-2 border-border text-sm" />
                    </div>
                    <div>
                      <p className="section-label mb-1">QUANTIDADE</p>
                      <Input type="number" value={bulkQty} onChange={e => setBulkQty(e.target.value)} placeholder="0" className="h-10 bg-surface-2 border-border text-sm" />
                    </div>
                    <div>
                      <p className="section-label mb-1">MÍN. ALERTA</p>
                      <Input type="number" value={bulkMin} onChange={e => setBulkMin(e.target.value)} placeholder="5" className="h-10 bg-surface-2 border-border text-sm" />
                    </div>
                    <div>
                      <p className="section-label mb-1">SKU</p>
                      <Input value={bulkSku || ''} onChange={e => setBulkSku(e.target.value)} placeholder="SKU" className="h-10 bg-surface-2 border-border text-sm" />
                    </div>
                  </div>
                  <Button onClick={applyBulk} className="w-full bg-primary text-primary-foreground rounded-[10px] h-10 font-semibold text-sm">
                    Aplicar a todos
                  </Button>
                </div>

                {/* Variation list — compact rows */}
                <div className="surface-card divide-y divide-border overflow-x-auto">
                  {/* Header */}
                  <div className="grid items-center gap-2 px-3 py-2 bg-surface-2 text-text-2" style={{ gridTemplateColumns: hasVar2 ? '1fr 1fr 80px 60px 60px' : '1fr 80px 60px 60px' }}>
                    <span className="section-label">{var1Name || 'Var 1'}</span>
                    {hasVar2 && <span className="section-label">{var2Name}</span>}
                    <span className="section-label">SKU</span>
                    <span className="section-label">Custo</span>
                    <span className="section-label">Qtd</span>
                  </div>

                  {/* Rows */}
                  {varRows.map((row, idx) => (
                    <div key={row.tempId + '-' + idx} className="grid items-center gap-2 px-3 py-2.5 hover:bg-surface-2/30 transition-colors" style={{ gridTemplateColumns: hasVar2 ? '1fr 1fr 80px 60px 60px' : '1fr 80px 60px 60px' }}>
                      {/* Var1 value */}
                      <p className="text-sm font-medium text-foreground truncate">
                        {hasVar2 ? row.atributos[var1Name] : getVariationLabel(row.atributos)}
                      </p>

                      {/* Var2 value */}
                      {hasVar2 && (
                        <p className="text-sm font-medium text-foreground truncate">{row.atributos[var2Name]}</p>
                      )}

                      {/* SKU */}
                      <input
                        value={row.sku}
                        onChange={e => updateVarRow(row.tempId, 'sku', e.target.value)}
                        className="h-8 bg-surface-2 border border-border rounded-md px-2 text-xs text-foreground outline-none w-full"
                        placeholder="SKU"
                      />

                      {/* Cost */}
                      <input
                        type="number"
                        step="0.01"
                        value={row.preco_custo || ''}
                        onChange={e => updateVarRow(row.tempId, 'preco_custo', e.target.value)}
                        className="h-8 bg-surface-2 border border-border rounded-md px-2 text-xs text-foreground outline-none font-mono font-mono-num w-full"
                        placeholder="0,00"
                      />

                      {/* Qty */}
                      <input
                        type="number"
                        min="0"
                        value={row.quantidade || ''}
                        onChange={e => updateVarRow(row.tempId, 'quantidade', e.target.value)}
                        className="h-8 bg-surface-2 border border-border rounded-md px-2 text-xs text-foreground outline-none font-mono font-mono-num w-full"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-text-3 text-center">{varRows.length} combinações geradas</p>
              </div>
            </>
          )}
        </div>}

        {/* ═══ FOOTER ═══ */}
        {step === 'form' && (
          <div className="shrink-0 p-4 border-t border-border bg-surface">
            <button
              onClick={handleSave}
              disabled={!nome.trim() || saving}
              className={cn(
                'w-full h-[52px] rounded-[10px] text-base font-semibold transition-all',
                nome.trim() && !saving
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sub-component: Variation Block
   ═══════════════════════════════════════════════ */

function VariationBlockUI({
  block,
  blockIdx,
  activeDropdown,
  setActiveDropdown,
  filteredSuggestions,
  updateBlock,
  removeBlock,
  addOptionToBlock,
  removeOptionFromBlock,
  updateOptionInBlock,
}: {
  block: VariationBlock;
  blockIdx: number;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  filteredSuggestions: (blockId: string, query: string) => string[];
  updateBlock: (id: string, updates: Partial<VariationBlock>) => void;
  removeBlock: (id: string) => void;
  addOptionToBlock: (id: string, value: string) => void;
  removeOptionFromBlock: (id: string, index: number) => void;
  updateOptionInBlock: (id: string, index: number, updates: Partial<VariationOption>) => void;
}) {
  const [newOptionValue, setNewOptionValue] = useState('');
  const suggestions = filteredSuggestions(block.id, block.typeName);
  const showDropdown = activeDropdown === block.id && suggestions.length > 0;

  return (
    <div className="surface-card p-3 space-y-3">
      {/* Title + remove */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Variação {blockIdx + 1}</span>
        <button onClick={() => removeBlock(block.id)} className="p-1 hover:bg-surface-2/80 rounded">
          <X className="w-4 h-4 text-text-2" />
        </button>
      </div>

      {/* Type name input with dropdown */}
      <div className="relative">
        <Input
          value={block.typeName}
          onChange={e => {
            updateBlock(block.id, { typeName: e.target.value });
            setActiveDropdown(block.id);
          }}
          onFocus={() => setActiveDropdown(block.id)}
          onBlur={() => setTimeout(() => setActiveDropdown(null), 150)}
          placeholder="Digite ou Selecione (ex: Cor, Tamanho)"
          className="h-10 text-sm bg-surface-2 border-border focus:border-primary"
        />
        {showDropdown && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2/80 transition-colors"
                onMouseDown={e => {
                  e.preventDefault();
                  updateBlock(block.id, { typeName: s });
                  setActiveDropdown(null);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options label */}
      <div className="flex items-center gap-1.5">
        <span className="text-primary text-sm leading-none">●</span>
        <span className="text-xs font-semibold">Opções</span>
      </div>

      {/* Options grid */}
      <div className="space-y-2">
        {block.options.map((opt, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
            <GripVertical className="w-4 h-4 text-text-3/50 cursor-grab" />
            <Input
              value={opt.value}
              onChange={e => updateOptionInBlock(block.id, i, { value: e.target.value })}
              className="h-8 text-xs bg-surface-2 border-border focus:border-primary"
              placeholder="Opção"
            />
            <Input
              value={opt.explanation}
              onChange={e => updateOptionInBlock(block.id, i, { explanation: e.target.value })}
              className="h-8 text-xs bg-surface-2 border-border focus:border-primary"
              placeholder="Adicionar uma explicação"
            />
            <button onClick={() => removeOptionFromBlock(block.id, i)} className="p-1 hover:bg-surface-2/80 rounded">
              <Trash2 className="w-3.5 h-3.5 text-text-2 hover:text-destructive" />
            </button>
          </div>
        ))}

        {/* Empty row to add new option */}
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
          <GripVertical className="w-4 h-4 text-text-3/20" />
          <Input
            value={newOptionValue}
            onChange={e => setNewOptionValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newOptionValue.trim()) {
                e.preventDefault();
                addOptionToBlock(block.id, newOptionValue);
                setNewOptionValue('');
              }
            }}
            onBlur={() => {
              if (newOptionValue.trim()) {
                addOptionToBlock(block.id, newOptionValue);
                setNewOptionValue('');
              }
            }}
            className="h-8 text-xs bg-surface-2 border-border focus:border-primary"
            placeholder="Adicionar opção..."
          />
          <div />
          <div className="w-6" />
        </div>
      </div>
    </div>
  );
}
