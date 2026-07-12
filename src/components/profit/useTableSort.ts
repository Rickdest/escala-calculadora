import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (r: T) => number | string | null | undefined>,
  initial?: { key: K; dir: SortDir },
) {
  const [sort, setSort] = useState<SortState<K>>(initial ?? { key: null, dir: null });

  const toggle = (key: K) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return { key: null, dir: null };
    });
  };

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return rows;
    const acc = accessors[sort.key];
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * factor;
    });
  }, [rows, sort, accessors]);

  return { sort, toggle, sorted, setSort };
}
