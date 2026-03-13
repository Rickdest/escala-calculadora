import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareResultProps {
  productName: string;
  salePrice: number;
  lucroBruto: number;
  roasEmpate: number | null;
  roasSaudavel: number | null;
  roasIdeal: number | null;
  status: 'danger' | 'warning' | 'success' | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const statusLabel = (s: string | null) =>
  s === 'success' ? '🟢 Lucrativo' : s === 'warning' ? '🟡 Risco' : '🔴 Prejuízo';

export function ShareResult({ productName, salePrice, lucroBruto, roasEmpate, roasSaudavel, roasIdeal, status }: ShareResultProps) {
  const handleShare = async () => {
    const text = [
      `📊 Análise ROAS — ${productName || 'Produto'}`,
      ``,
      `💰 Preço de venda: ${formatCurrency(salePrice)}`,
      `📈 Lucro por venda: ${formatCurrency(lucroBruto)}`,
      roasEmpate ? `⚡ ROAS de Empate: ${roasEmpate.toFixed(2)}x` : '',
      roasSaudavel ? `✅ ROAS Saudável: ${roasSaudavel.toFixed(2)}x` : '',
      roasIdeal ? `🎯 ROAS Ideal: ${roasIdeal.toFixed(2)}x` : '',
      `📋 Status: ${statusLabel(status)}`,
      ``,
      `— Calculado com Precify`,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resultado copiado para a área de transferência!');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Resultado copiado!');
    }
  };

  return (
    <Button onClick={handleShare} variant="outline" size="sm" className="gap-2 text-xs h-9 rounded-xl active:scale-95 transition-transform">
      <Share2 className="w-3.5 h-3.5" />
      Compartilhar Resultado
    </Button>
  );
}
