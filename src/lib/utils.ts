import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MarginStatus {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  message: string;
}

export function getMarginStatus(margin: number): MarginStatus {
  if (margin < 0) return {
    label: 'Prejuízo',
    emoji: 'trending-down',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    message: 'Revise o preço ou custo',
  };
  if (margin < 10) return {
    label: 'Atenção',
    emoji: 'alert-triangle',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    message: 'Margem abaixo de 10%',
  };
  if (margin < 17) return {
    label: 'Saudável',
    emoji: 'check-circle',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    message: 'Boa margem para operar',
  };
  return {
    label: 'Lucrativo',
    emoji: 'trending-up',
    color: 'text-success',
    bg: 'bg-success/15',
    border: 'border-success/40',
    message: 'Meta atingida — hora de escalar',
  };
}
