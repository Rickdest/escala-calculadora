
## Corrigir de verdade os botões de Vincular/Cadastrar nos cards da aba Análise de Ads

### Diagnóstico
O problema não está no modal nem no hook principal. O bloqueio está no próprio layout do card:

- Em `src/components/roas/AdsProductCard.tsx`, a área inferior de ações só aparece quando `!isLinked`.
- Se o anúncio foi vinculado automaticamente (`product_id` preenchido), os botões somem do card.
- Para anúncios vinculados, hoje existe apenas:
  - um ícone pequeno de link no header;
  - ações dentro da tela de detalhe.
- Isso não atende ao que você quer: ações visíveis diretamente no card da aba Análise de Ads.

### Causa raiz
A lógica atual trata os botões como estado exclusivo de “não vinculado”:

```tsx
{!isLinked ? ( ...botões... ) : isLinked && (!ad.roas_empate || ad.roas_empate <= 0) ? ( ...aviso... ) : null}
```

Ou seja:
- não vinculado = mostra botões;
- vinculado sem preço = mostra só aviso;
- vinculado com preço = não mostra nada na parte inferior.

Na prática, os botões “sumiram” porque o card foi redesenhado para ocultar as ações quando existe vínculo.

### Abordagem de correção
Vou restaurar o comportamento esperado no card, mantendo o layout novo, mas com ações explícitas no rodapé do card.

### Implementação proposta

#### 1) `src/components/roas/AdsProductCard.tsx`
Reorganizar a área de ações para ficar sempre útil no card:

- Manter os botões visíveis no card, não só para não vinculados.
- Ajustar os estados assim:

**Se não estiver vinculado**
- mostrar texto de apoio;
- botão `Vincular`;
- botão `Cadastrar`.

**Se estiver vinculado**
- mostrar botão principal para `Trocar vínculo` (ou `Vincular produto`, reaproveitando `onLink`);
- manter botão `Cadastrar` visível no card, para o usuário conseguir cadastrar outro produto rapidamente sem depender da tela de detalhe;
- se faltar custo/preço (`!ad.roas_empate || ad.roas_empate <= 0`), manter também o aviso amarelo.

Resultado esperado:
- os cards voltam a ter ações claras;
- o auto-match não “esconde” mais a possibilidade de correção;
- o usuário consegue agir sem abrir detalhe.

#### 2) `src/components/roas/AdsTab.tsx`
Validar apenas o fluxo de callbacks já existente:

- `onLink={() => setLinkTarget(ad.id)}`
- `onQuickRegister={() => setQuickRegTarget(ad)}`

A lógica já está pronta; o problema principal é só de renderização/UX no card.

#### 3) `src/components/roas/AdsDetailFullView.tsx`
Não precisa mudar a lógica central.
Os botões de detalhe podem continuar existindo como ações secundárias.
O foco da correção é devolver as ações ao card.

### Resultado final esperado
Na aba **Análise de Ads**:

- os cards voltam a exibir ações visíveis;
- anúncios não vinculados mostram `Vincular` + `Cadastrar`;
- anúncios vinculados mostram `Trocar vínculo` + `Cadastrar`;
- anúncios vinculados sem preço/custo continuam exibindo o aviso amarelo;
- nada muda nos cálculos, hooks, importação ou persistência.

### Arquivos envolvidos
- `src/components/roas/AdsProductCard.tsx`
- `src/components/roas/AdsTab.tsx` (validação do fluxo, sem refactor grande)

### Observação técnica
Não vejo indício de problema de backend ou de estado global aqui. É um problema de regra visual no card: os botões foram condicionados de forma restritiva demais durante o redesign.
