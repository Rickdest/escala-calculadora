import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ShopeeCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('[ShopeeCallback] Full URL:', window.location.href);
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');
    const state = searchParams.get('state');
    console.log('[ShopeeCallback] code:', code);
    console.log('[ShopeeCallback] shop_id:', shopId);
    console.log('[ShopeeCallback] state:', state);

    // Forward params to the edge function for secure token exchange
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (shopId) params.set('shop_id', shopId);
    if (state) params.set('state', state);

    window.location.href = `${supabaseUrl}/functions/v1/shopee-callback?${params.toString()}`;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Finalizando conexão com a Shopee...</p>
    </div>
  );
}
