import { Smartphone, Share, MoreVertical, Plus, Download, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onInstall?: () => void;
  hasNativePrompt?: boolean;
}

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

export function InstallTutorial({ onClose, onInstall, hasNativePrompt }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Instale o Skalify</h2>
              <p className="text-xs text-muted-foreground">Acesse como app, sem navegador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {isIOS ? (
            <>
              <Step num={1} icon={<Share className="w-4 h-4" />} text='Toque no botão "Compartilhar"' hint="(ícone ⬆ na barra do Safari)" />
              <Step num={2} icon={<Plus className="w-4 h-4" />} text='"Adicionar à Tela de Início"' />
              <Step num={3} icon={<Download className="w-4 h-4" />} text='Toque em "Adicionar"' />
            </>
          ) : (
            <>
              {hasNativePrompt ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Toque no botão abaixo para instalar diretamente:
                </div>
              ) : (
                <>
                  <Step num={1} icon={<MoreVertical className="w-4 h-4" />} text="Toque no menu do navegador" hint="(ícone ⋮ no canto superior)" />
                  <Step num={2} icon={<Download className="w-4 h-4" />} text='"Adicionar à tela inicial"' />
                </>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        {hasNativePrompt && !isIOS ? (
          <button
            onClick={onInstall}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Instalar agora
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Entendi 👍
          </button>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Você pode instalar depois em Configurações
        </p>
      </div>
    </div>
  );
}

function Step({ num, icon, text, hint }: { num: number; icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-primary">{num}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium text-foreground">{text}</span>
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{hint}</p>}
      </div>
    </div>
  );
}
