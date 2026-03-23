import { useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Store } from '@/types/store';
import { supabase } from '@/integrations/supabase/client';
import { uploadProductImage } from '@/lib/imageUtils';
import { toast } from 'sonner';
import { getLocalImages, LOCAL_IMAGES_KEY, MIGRATION_DONE_KEY } from '@/lib/storeMappers';

export function useImageMigration(
  user: User | null,
  stores: Store[],
  isLoading: boolean,
  invalidate: () => void
) {
  const migrationStarted = useRef(false);

  useEffect(() => {
    if (!user || migrationStarted.current || localStorage.getItem(MIGRATION_DONE_KEY)) return;
    if (stores.length === 0 || isLoading) return;

    migrationStarted.current = true;
    (async () => {
      try {
        const localImages = getLocalImages();
        const productIds = Object.keys(localImages);
        if (productIds.length === 0) {
          localStorage.setItem(MIGRATION_DONE_KEY, '1');
          return;
        }

        let migrated = 0;
        for (const productId of productIds) {
          const base64 = localImages[productId];
          if (!base64) continue;
          const url = await uploadProductImage(user.id, productId, base64);
          if (url) {
            await supabase.from('products').update({ image_url: url }).eq('id', productId).eq('user_id', user.id);
            delete localImages[productId];
            migrated++;
          }
        }

        localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(localImages));
        if (Object.keys(localImages).length === 0) localStorage.removeItem(LOCAL_IMAGES_KEY);
        localStorage.setItem(MIGRATION_DONE_KEY, '1');

        if (migrated > 0) {
          toast.success(`${migrated} imagem(ns) migrada(s) para a nuvem`);
          invalidate();
        }
      } catch {
        // Silent — don't block the app
      }
    })();
  }, [user?.id, stores, isLoading]);
}
