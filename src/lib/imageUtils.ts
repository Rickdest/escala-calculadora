import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'product-images';

/** Compress image to JPEG with max dimensions and quality */
export async function compressImage(
  dataUrl: string,
  maxSize = 300,
  quality = 0.5
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Upload compressed image to Supabase Storage, returns signed URL */
export async function uploadProductImage(
  userId: string,
  productId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const compressed = await compressImage(dataUrl, 300, 0.5);
    const res = await fetch(compressed);
    const blob = await res.blob();
    const path = `${userId}/${productId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) return null;

    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 604800); // 7 days

    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

/** Delete image from Storage */
export async function deleteProductImage(
  userId: string,
  productId: string
): Promise<void> {
  try {
    await supabase.storage
      .from(BUCKET)
      .remove([`${userId}/${productId}.jpg`]);
  } catch {
    // silent
  }
}

/** Get signed URL for existing image */
export async function getProductImageUrl(
  userId: string,
  productId: string
): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(`${userId}/${productId}.jpg`, 604800); // 7 days
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

/** Upload estoque image to Supabase Storage */
export async function uploadEstoqueImage(
  userId: string,
  productId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const compressed = await compressImage(dataUrl, 300, 0.5);
    const res = await fetch(compressed);
    const blob = await res.blob();
    const path = `${userId}/estoque/${productId}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 604800);
    return data?.signedUrl || null;
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
