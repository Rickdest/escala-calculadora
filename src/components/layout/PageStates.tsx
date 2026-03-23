import { ShoppingBag } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  minHeight?: string;
}

export function PageLoader({ message = 'Carregando...', minHeight = 'min-h-[60vh]' }: PageLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${minHeight}`}>
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-4" />
      <p className="text-text-2 text-sm">{message}</p>
    </div>
  );
}

interface PageErrorProps {
  onRetry?: () => void;
  minHeight?: string;
}

export function PageError({ onRetry, minHeight = 'min-h-[60vh]' }: PageErrorProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} gap-4 px-6 text-center`}>
      <p className="text-text-2 text-sm">Erro ao carregar seus dados.</p>
      {onRetry && (
        <button onClick={onRetry} className="text-primary underline text-sm">Tentar novamente</button>
      )}
    </div>
  );
}

interface PageEmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}

export function PageEmpty({
  icon,
  title = 'Nenhum produto ainda',
  description = 'Adicione seu primeiro produto para começar a precificar',
}: PageEmptyProps) {
  return (
    <div className="text-center py-10 animate-fade-up">
      <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
        {icon || <ShoppingBag className="w-7 h-7 text-text-3" />}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-text-2 mb-5 max-w-xs mx-auto">{description}</p>
    </div>
  );
}
