import { useState, useEffect } from 'react';
import { X, Plus, Minus, Edit2, Trash2, Package, AlertTriangle, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { EstoqueProduto, EstoqueMovimentacao, useEstoque, getLocalStockImage } from '@/hooks/useEstoque';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  product: EstoqueProduto;
  onClose: () => void;
  onEdit: () => void;
}

const MOTIVOS = ['Venda Shopee', 'Compra', 'Devolução', 'Avaria', 'Ajuste manual', 'Outro'];

export function StockDetail({ product, onClose, onEdit }: Props) {
  const { deleteProduto, addMovimentacao, getMovimentacoes } = useEstoque();
  const [tab, setTab] = useState<'estoque' | 'historico'>('estoque');
  const [showDelete, setShowDelete] = useState(false);
  const [movModal, setMovModal] = useState<{ variacaoId: string; tipo: 'entrada' | 'saida' | 'ajuste' } | null>(null);
  const [movQty, setMovQty] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<EstoqueMovimentacao[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const localImg = getLocalStockImage(product.id);
  const totalQty = product.variacoes.reduce((s, v) => s + v.quantidade, 0);

  useEffect(() => {
    if (tab === 'historico') {
      setLoadingHist(true);
      getMovimentacoes(product.variacoes.map(v => v.id)).then(m => {
        setMovimentacoes(m);
        setLoadingHist(false);
      });
    }
  }, [tab, product]);

  const handleDelete = async () => {
    await deleteProduto(product.id);
    onClose();
  };

  const handleMov = async () => {
    if (!movModal || !movQty) return;
    const qty = parseInt(movQty);
    if (isNaN(qty) || qty <= 0) return;
    await addMovimentacao(movModal.variacaoId, movModal.tipo, qty, movMotivo || undefined);
    setMovModal(null);
    setMovQty('');
    setMovMotivo('');
  };

  const quickChange = async (variacaoId: string, delta: number) => {
    const tipo = delta > 0 ? 'entrada' : 'saida';
    await addMovimentacao(variacaoId, tipo, Math.abs(delta), tipo === 'entrada' ? 'Entrada rápida' : 'Saída rápida');
  };

  const getStatus = (qty: number, min: number) => {
    if (qty === 0) return { icon: '🔴', color: 'text-destructive', label: 'Sem estoque' };
    if (qty <= min) return { icon: '🟡', color: 'text-warning', label: 'Baixo' };
    return { icon: '🟢', color: 'text-success', label: 'Normal' };
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm">
      <div className="fixed inset-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:my-4 bg-surface md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {localImg && <img src={localImg} alt="" className="w-10 h-10 rounded-lg object-cover" />}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate">{product.nome}</h2>
            {product.categoria && <p className="text-xs text-text-2">{product.categoria}</p>}
          </div>
          <div className="flex gap-1.5">
            <button onClick={onEdit} className="p-2 hover:bg-surface-2/80 rounded-lg"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => setShowDelete(true)} className="p-2 hover:bg-surface-2/80 rounded-lg text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 hover:bg-surface-2/80 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['estoque', 'historico'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              'flex-1 py-2.5 text-xs font-semibold transition-all border-b-2',
              tab === t ? 'text-primary border-primary' : 'text-text-2 border-transparent'
            )}>
              {t === 'estoque' ? 'Estoque' : 'Histórico'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {showDelete && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="text-sm font-bold text-destructive">Excluir este produto?</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDelete(false)} className="flex-1">Cancelar</Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="flex-1">Excluir</Button>
              </div>
            </div>
          )}

          {tab === 'estoque' && (
            <>
              {!product.tem_variacoes ? (
                /* Simple product */
                (() => {
                  const v = product.variacoes[0];
                  if (!v) return <p className="text-sm text-text-2">Nenhuma variação cadastrada</p>;
                  const st = getStatus(v.quantidade, v.quantidade_minima);
                  return (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <p className={cn('text-5xl font-bold font-mono font-mono-num', st.color)}>{v.quantidade}</p>
                        <p className="text-xs text-text-2 mt-1">unidades · {st.icon} {st.label}</p>
                        <p className="text-xs text-text-3">Mín: {v.quantidade_minima} un</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button onClick={() => setMovModal({ variacaoId: v.id, tipo: 'entrada' })} className="h-11 flex flex-col gap-0.5 bg-primary text-primary-foreground rounded-[10px] font-semibold text-xs">
                          <Plus className="w-4 h-4" /> Entrada
                        </Button>
                        <Button onClick={() => setMovModal({ variacaoId: v.id, tipo: 'saida' })} variant="outline" className="h-11 flex flex-col gap-0.5 text-xs">
                          <Minus className="w-4 h-4" /> Saída
                        </Button>
                        <Button onClick={() => setMovModal({ variacaoId: v.id, tipo: 'ajuste' })} variant="outline" className="h-11 flex flex-col gap-0.5 text-xs">
                          <Settings2 className="w-4 h-4" /> Ajuste
                        </Button>
                      </div>

                      <div className="surface-card p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-text-2">Custo unitário</span><span className="font-semibold font-mono font-mono-num">{formatCurrency(v.preco_custo)}</span></div>
                        <div className="flex justify-between"><span className="text-text-2">Valor em estoque</span><span className="font-bold font-mono font-mono-num text-primary">{formatCurrency(v.preco_custo * v.quantidade)}</span></div>
                        {v.sku && <div className="flex justify-between"><span className="text-text-2">SKU</span><span className="font-semibold">{v.sku}</span></div>}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* With variations */
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-text-2 font-semibold">Total: {totalQty} un · {product.variacoes.length} variações</span>
                  </div>

                  <div className="surface-card overflow-hidden">
                    <div className="grid grid-cols-[1fr_50px_auto] gap-0 bg-surface-2 px-3 py-1.5">
                      <span className="section-label">Variação</span><span className="section-label text-center">Qtd</span><span className="section-label text-center">Ação</span>
                    </div>
                    <div className="divide-y divide-border">
                      {product.variacoes.map(v => {
                        const label = Object.values(v.atributos).join(' / ') || 'Padrão';
                        const st = getStatus(v.quantidade, v.quantidade_minima);
                        return (
                          <div key={v.id} className="grid grid-cols-[1fr_50px_auto] gap-0 px-3 py-2 items-center">
                            <div>
                              <p className="text-xs font-medium">{label}</p>
                              {v.sku && <p className="text-[10px] text-text-3">SKU: {v.sku}</p>}
                            </div>
                            <p className={cn('text-center text-sm font-bold font-mono font-mono-num', st.color)}>
                              {v.quantidade}{st.icon === '🔴' ? '🔴' : st.icon === '🟡' ? '🟡' : ''}
                            </p>
                            <div className="flex items-center gap-1">
                              <button onClick={() => quickChange(v.id, -1)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-surface-2/80">
                                <Minus className="w-3 h-3" />
                              </button>
                              <button onClick={() => quickChange(v.id, 1)} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-surface-2/80">
                                <Plus className="w-3 h-3" />
                              </button>
                              <button onClick={() => setMovModal({ variacaoId: v.id, tipo: 'entrada' })} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-surface-2/80 text-text-2">
                                <span className="text-[10px]">···</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'historico' && (
            <div className="space-y-1">
              {loadingHist ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
              ) : movimentacoes.length === 0 ? (
                <p className="text-sm text-text-2 text-center py-8">Nenhuma movimentação registrada</p>
              ) : (
                movimentacoes.map(m => {
                  const isIn = m.tipo === 'entrada';
                  const isAdj = m.tipo === 'ajuste';
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border">
                      <div className={cn('w-7 h-7 rounded flex items-center justify-center', isIn ? 'bg-success/10' : isAdj ? 'bg-surface-2' : 'bg-destructive/10')}>
                        {isIn ? <ArrowUp className="w-3.5 h-3.5 text-success" /> : isAdj ? <Settings2 className="w-3.5 h-3.5 text-text-2" /> : <ArrowDown className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">
                          <span className={isIn ? 'text-success' : isAdj ? 'text-foreground' : 'text-destructive'}>
                            {isIn ? '+' : isAdj ? '=' : '-'}{m.quantidade}
                          </span>
                          {' '}{m.motivo || m.tipo}
                        </p>
                      </div>
                      <span className="text-[10px] text-text-3 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('pt-BR')} {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Movement modal */}
      {movModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm p-4 space-y-4">
            <h3 className="text-base font-bold">Movimentação de estoque</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Tipo</label>
              <Select value={movModal.tipo} onValueChange={v => setMovModal({ ...movModal, tipo: v as any })}>
                <SelectTrigger className="h-9 text-sm bg-surface-2 border-border focus:border-primary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Quantidade</label>
              <Input type="number" min="1" value={movQty} onChange={e => setMovQty(e.target.value)} className="h-9 text-sm bg-surface-2 border-border focus:border-primary" placeholder="0" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Motivo</label>
              <Select value={movMotivo} onValueChange={setMovMotivo}>
                <SelectTrigger className="h-9 text-sm bg-surface-2 border-border focus:border-primary"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setMovModal(null); setMovQty(''); setMovMotivo(''); }} className="flex-1">Cancelar</Button>
              <Button onClick={handleMov} disabled={!movQty || parseInt(movQty) <= 0} className="flex-1 bg-primary text-primary-foreground rounded-[10px] font-semibold">Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
