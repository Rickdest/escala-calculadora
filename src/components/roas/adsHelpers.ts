import { TrendingUp, TrendingDown, AlertTriangle, Package } from 'lucide-react';

export const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function fmtShort(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
}

export type FilterType = 'all' | 'LUCRATIVO' | 'MARGEM_APERTADA' | 'ABAIXO_EMPATE' | 'PREJUIZO' | 'unlinked';

export function getClassCor(cls: string | null) {
  if (cls === 'LUCRATIVO') return { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: TrendingUp, label: 'Lucrativo' };
  if (cls === 'MARGEM_APERTADA') return { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'Margem Apertada' };
  if (cls === 'ABAIXO_EMPATE') return { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'Abaixo do Empate' };
  if (cls === 'PREJUIZO') return { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: TrendingDown, label: 'Prejuízo' };
  return { color: 'text-text-3', bg: 'bg-surface-2 border-border', icon: Package, label: 'Não vinculado' };
}

export function getRoasColor(roas: number) {
  if (roas >= 5) return 'text-success';
  if (roas >= 2) return 'text-warning';
  return 'text-destructive';
}

export function getDiasPeriodo(inicio: string, fim: string): number {
  return Math.ceil((new Date(fim).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24));
}
