import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEstoque } from '@/hooks/useEstoque';

export function StockAlertBanner() {
  const navigate = useNavigate();
  const { stats, loading } = useEstoque();

  if (loading) return null;

  const alertCount = stats.baixo + stats.zerado;
  if (alertCount === 0) return null;

  return (
    <button
      onClick={() => navigate('/stock')}
      className="w-full bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-3 text-left hover:bg-warning/15 transition-colors animate-fade-up"
    >
      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          ⚠️ {alertCount} produto{alertCount > 1 ? 's' : ''} precisa{alertCount > 1 ? 'm' : ''} de atenção
        </p>
        <p className="text-xs text-muted-foreground">Ver no estoque →</p>
      </div>
    </button>
  );
}
