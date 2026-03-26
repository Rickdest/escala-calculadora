import { useMemo } from 'react';

interface ProductThumbnailProps {
  productId: string;
  productName: string;
  imageUrl?: string;
}

export function ProductThumbnail({ productName, imageUrl }: ProductThumbnailProps) {
  const initial = (productName || '?').charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={productName}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
      <span className="text-[16px] font-bold text-text-3">{initial}</span>
    </div>
  );
}
