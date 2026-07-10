import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_ML_FEE_CONFIG, MLFeeConfigData, MLFeeTier } from '@/lib/profit/mercadoLivreCalc';

export interface MLFeeConfigRecord extends MLFeeConfigData {
  id: string;
  user_id: string;
  store_id: string;
  other_fees: any[];
  effective_date: string;
  updated_at: string;
}

export function useMLFeeConfig(storeId?: string) {
  const { user } = useAuth();
  const [config, setConfig] = useState<MLFeeConfigRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId || !user) {
      setConfig(null);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('ml_fee_config')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();
    setConfig(data as any);
    setLoading(false);
  }, [storeId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(
    async (patch: Partial<MLFeeConfigData> & { fixed_fee_tiers?: MLFeeTier[]; effective_date?: string }) => {
      if (!user || !storeId) return;
      const base = config ?? { ...DEFAULT_ML_FEE_CONFIG, other_fees: [], effective_date: new Date().toISOString().slice(0, 10) };
      const payload: any = {
        user_id: user.id,
        store_id: storeId,
        classic_pct: patch.classic_pct ?? base.classic_pct,
        premium_pct: patch.premium_pct ?? base.premium_pct,
        fixed_fee_min_price: patch.fixed_fee_min_price ?? base.fixed_fee_min_price,
        fixed_fee_tiers: patch.fixed_fee_tiers ?? base.fixed_fee_tiers,
        other_fees: (base as any).other_fees ?? [],
        effective_date: patch.effective_date ?? (base as any).effective_date ?? new Date().toISOString().slice(0, 10),
      };
      if (config?.id) payload.id = config.id;
      const { error } = await supabase.from('ml_fee_config').upsert(payload, { onConflict: 'user_id,store_id' });
      if (error) throw error;
      await refresh();
    },
    [user, storeId, config, refresh],
  );

  const effective: MLFeeConfigData = config
    ? {
        classic_pct: Number(config.classic_pct),
        premium_pct: Number(config.premium_pct),
        fixed_fee_min_price: Number(config.fixed_fee_min_price),
        fixed_fee_tiers: (config.fixed_fee_tiers as any) || DEFAULT_ML_FEE_CONFIG.fixed_fee_tiers,
      }
    : DEFAULT_ML_FEE_CONFIG;

  return { config, effective, loading, save, refresh };
}
