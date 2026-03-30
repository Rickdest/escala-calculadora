

## Adicionar botão "Integrar com Shopee" (em paralelo com CSV)

### Contexto
A integração via API da Shopee ainda está em análise/aprovação. O modelo atual de importação CSV deve continuar funcionando normalmente. Vamos adicionar um botão de integração que, por enquanto, mostra um estado "em breve" / "em análise", preparando a UI para quando a integração for aprovada.

### Mudanças

**1. Atualizar `src/components/roas/AdsEmptyState.tsx`**
- Adicionar um segundo botão "Integrar com Shopee" abaixo do botão "Importar CSV"
- O botão terá estilo outline com o logo/ícone da Shopee
- Ao clicar, abre um modal/toast informando que a integração está em análise pela Shopee e que o usuário será notificado quando estiver disponível
- Separar os dois botões com um divisor "ou" visual

**2. Atualizar `src/components/roas/AdsTab.tsx`**
- No header onde aparece o botão "Atualizar CSV" (quando já tem dados), adicionar um botão secundário "Integrar com Shopee" ao lado
- Mesmo comportamento: ao clicar, mostra aviso de "em análise"

**3. Criar `src/components/roas/ShopeeIntegrationModal.tsx`**
- Modal simples com:
  - Ícone da Shopee
  - Título: "Integração com Shopee"
  - Texto explicando que a integração direta está em análise
  - Badge "Em breve"
  - Bullet points dos benefícios futuros (sync automático, dados em tempo real, sem CSV manual)
  - Botão "Continuar com CSV" que fecha o modal
  - Campo opcional de email/toggle para "Me avise quando estiver disponível"

### Resultado
- Usuário vê que integração direta está a caminho, gerando expectativa
- CSV continua 100% funcional como método principal
- Quando a API for aprovada, basta ativar a funcionalidade no modal sem mudar a estrutura

