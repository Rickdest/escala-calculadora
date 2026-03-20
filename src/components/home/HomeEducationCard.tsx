import { useNavigate } from 'react-router-dom';

export function HomeEducationCard() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/education')}
      className="w-full surface-card p-4 flex items-center gap-3 text-left hover:bg-surface-2/50 transition-colors animate-fade-up stagger-3 border-l-[3px] border-l-primary"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground">Aprenda a Vender Mais</p>
        <p className="text-[13px] text-text-2 mt-0.5">Tutoriais exclusivos</p>
      </div>
      <span className="text-[13px] text-primary font-medium flex-shrink-0">Acessar →</span>
    </button>
  );
}
