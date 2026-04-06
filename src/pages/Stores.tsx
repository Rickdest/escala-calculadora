import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, MoreVertical, Trash2, Edit2, Check, X, Package, Link2, Lock } from 'lucide-react';
import { useStoreLimit } from '@/hooks/useStoreLimit';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function Stores() {
  const { stores, currentStore, setCurrentStore, addStore, updateStore, deleteStore, getStoreStats } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch all shopee tokens for this user to show badges per store
  const { data: shopeeTokens } = useQuery({
    queryKey: ['shopee-tokens-all', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('shopee_tokens')
        .select('store_id, app_type, shop_id')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const getStoreIntegrations = (storeId: string) => {
    if (!shopeeTokens) return { seller: false, ads: false };
    return {
      seller: shopeeTokens.some(t => t.store_id === storeId && t.app_type === 'seller'),
      ads: shopeeTokens.some(t => t.store_id === storeId && t.app_type === 'ads'),
    };
  };

  const handleAddStore = async () => {
    if (newStoreName.trim()) {
      const store = await addStore(newStoreName.trim());
      setCurrentStore(store);
      setNewStoreName('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (store: typeof stores[0]) => {
    setEditingId(store.id);
    setEditingName(store.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateStore(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteStore(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Minhas Lojas"
        subtitle={`${stores.length} loja${stores.length !== 1 ? 's' : ''}`}
        showStoreSelector={false}
        action={
          <Button size="sm" onClick={() => setIsAdding(true)} className="gradient-primary">
            <Plus className="w-4 h-4" />
          </Button>
        }
      />

      <div className="py-6 md:py-8 space-y-4">
        {/* Add New Store */}
        {isAdding && (
          <div className="glass-card p-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Nome da nova loja..."
                  className="input-modern h-12"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddStore();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                />
              </div>
              <Button size="icon" onClick={handleAddStore} disabled={!newStoreName.trim()} className="h-12 w-12 gradient-primary">
                <Check className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="secondary" onClick={() => setIsAdding(false)} className="h-12 w-12">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Stores List */}
        {stores.length > 0 ? (
          <div className="space-y-3">
            {stores.map((store, index) => {
              const stats = getStoreStats(store);
              const isSelected = currentStore?.id === store.id;
              const isEditing = editingId === store.id;

              return (
                <div 
                  key={store.id}
                  className={cn(
                    'glass-card-hover p-4',
                    isSelected && 'ring-2 ring-primary'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => !isEditing && setCurrentStore(store)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                      isSelected ? 'gradient-primary' : 'bg-secondary'
                    )}>
                      <Store className={cn(
                        'w-7 h-7',
                        isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-10 input-modern"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button 
                            size="icon" 
                            className="h-10 w-10 gradient-primary" 
                            onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-10 w-10"
                            onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-bold text-foreground truncate text-lg">{store.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                              <Package className="w-3 h-3" />
                              {stats.totalProducts} produtos
                            </span>
                            {stats.totalProducts > 0 && (
                              <span className={cn(
                                'text-xs font-bold',
                                stats.avgMargin >= store.config.desiredMargin ? 'text-success' : 'text-warning'
                              )}>
                                {stats.avgMargin.toFixed(1)}% margem
                              </span>
                            )}
                          </div>
                          {(() => {
                            const integrations = getStoreIntegrations(store.id);
                            if (!integrations.seller && !integrations.ads) return null;
                            return (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {integrations.seller && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                                    🛍 Seller ✓
                                  </Badge>
                                )}
                                {integrations.ads && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                                    📊 Ads ✓
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-2.5 hover:bg-secondary rounded-xl transition-colors">
                            <MoreVertical className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation(); 
                            setCurrentStore(store);
                            navigate('/configuracoes/integracoes');
                          }}>
                            <Link2 className="w-4 h-4 mr-2" />
                            Conectar Shopee
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStartEdit(store); }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(store.id); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {isSelected && !isEditing && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <span className="text-xs font-bold text-primary">✓ Loja Selecionada</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Store className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Nenhuma loja</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crie sua primeira loja para começar
            </p>
            <Button onClick={() => setIsAdding(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Criar Loja
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os produtos desta loja serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
