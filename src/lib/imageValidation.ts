/** Validate image file magic bytes (JPEG, PNG, WebP) */
export async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;

  // PNG: 89 50 4E 47
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;

  // WebP: 52 49 46 46 ... 57 45 42 50
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  return isJpeg || isPng || isWebp;
}

/** Validate image file magic bytes from a dataUrl string */
export async function validateImageDataUrl(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'check', { type: blob.type });
    return validateImageMagicBytes(file);
  } catch {
    return false;
  }
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** Validate file size (max 5MB) */
export function validateImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE;
}
