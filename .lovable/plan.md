

## Plano: Tutorial de instalação PWA no primeiro acesso mobile

### O que será feito
Ao fazer login pela primeira vez em dispositivo móvel, o usuário verá um modal com passo-a-passo para instalar o Skalify como app na tela inicial — com instruções diferentes para Android e iOS.

### Arquivos a criar

**1. `src/hooks/useInstallPrompt.ts`**
- Detecta se é mobile via `userAgent`
- Captura o evento `beforeinstallprompt` (Android) para permitir instalação nativa
- Verifica `localStorage("installTutorialSeen")` para mostrar apenas na primeira vez
- Exibe o tutorial com delay de 2s após carregar a Home
- Expõe: `showTutorial`, `markAsSeen`, `deferredPrompt`, `installApp()`

**2. `src/components/InstallTutorial.tsx`**
- Modal fullscreen com overlay escuro
- Detecta iOS vs Android para mostrar instruções específicas:
  - **iOS**: Compartilhar → Adicionar à Tela de Início → Adicionar
  - **Android**: Se `deferredPrompt` disponível, botão direto "Instalar agora" que chama `prompt()`. Senão, instruções manuais (menu ⋮ → Adicionar à tela inicial)
- Botão "Entendi" fecha e marca como visto
- Design consistente com o tema do app (bg-card, text-foreground, botão orange)

### Arquivo a modificar

**3. `src/pages/Home.tsx`**
- Importar `useInstallPrompt` e `InstallTutorial`
- Renderizar `{showTutorial && <InstallTutorial ... />}` dentro do layout
- Passar `onClose={markAsSeen}`, `onInstall={installApp}`, `deferredPrompt`

### Detalhes
- Não envolve `vite-plugin-pwa` nem service workers — o `manifest.json` com `display: standalone` já existe e é suficiente para instalação
- O tutorial é apenas UI educativa + gatilho nativo do Android quando disponível
- `localStorage` garante que só aparece uma vez por dispositivo

