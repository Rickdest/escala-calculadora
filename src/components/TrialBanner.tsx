import { useSubscription } from '@/contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TrialBanner() {
  const { status, trialEnd } = useSubscription();
  const navigate = useNavigate();

  if (status !== 'trialing' || !trialEnd) return null;

  const now = new Date();
  const end = new Date(trialEnd);
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const isLastDay = daysLeft === 1;

  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 ${
      isLastDay 
        ? 'bg-destructive/10 border border-destructive/20' 
        : 'bg-primary/10 border border-primary/20'
    }`}>
      {isLastDay ? (
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
      ) : (
        <Clock className="w-5 h-5 text-primary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isLastDay ? 'text-destructive' : 'text-primary'}`}>
          {isLastDay
            ? '⚠️ Último dia de teste! Assine agora e não perca o acesso.'
            : `⏳ Você tem ${daysLeft} dias de teste grátis restantes`}
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate('/paywall')}
        className={`shrink-0 text-xs font-bold ${
          isLastDay ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''
        }`}
      >
        Assinar agora
      </Button>
    </div>
  );
}
