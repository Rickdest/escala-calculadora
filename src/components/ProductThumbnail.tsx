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
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: '#1e1e1e', border: '0.5px solid #252525' }}
    >
      <span className="text-[16px] font-bold" style={{ color: '#444444' }}>{initial}</span>
    </div>
  );
}
