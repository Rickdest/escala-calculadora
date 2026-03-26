import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'product-images';

/** Compress image to JPEG with max dimensions and quality */
export async function compressImage(
  dataUrl: string,
  maxSize = 400,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Convert dataUrl to Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

/** Upload compressed image to Supabase Storage, returns public URL */
export async function uploadProductImage(
  userId: string,
  productId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const compressed = await compressImage(dataUrl, 400, 0.75);
    const blob = dataUrlToBlob(compressed);
    const path = `${userId}/${productId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.error('Erro ao fazer upload da imagem:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('uploadProductImage falhou:', err);
    return null;
  }
}

/** Delete image from Storage */
export async function deleteProductImage(
  userId: string,
  productId: string
): Promise<void> {
  const path = `${userId}/${productId}.jpg`;
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Upload estoque image to Supabase Storage */
export async function uploadEstoqueImage(
  userId: string,
  productId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const compressed = await compressImage(dataUrl, 400, 0.75);
    const blob = dataUrlToBlob(compressed);
    const path = `${userId}/estoque/${productId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/** Delete estoque image from Storage */
export async function deleteEstoqueImage(userId: string, productId: string): Promise<void> {
  try {
    await supabase.storage.from(BUCKET).remove([`${userId}/estoque/${productId}.jpg`]);
  } catch { /* silent */ }
}
