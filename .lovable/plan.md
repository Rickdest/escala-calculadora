

## Auditoria Completa do App — Bugs e Melhorias Encontrados

### Metodologia
Revisão de código de todos os módulos principais, execução de 45 testes unitários (todos passando), análise de logs do dev-server (sem erros), e inspeção de fluxos de cálculo, importação e navegação.

---

### 🐛 Bug 1: Calculadora Shopee ignora taxa CPF de R$3

**Gravidade: Média** — Cálculo incorreto para vendedores CPF

**Local:** `src/components/calculators/ShopeeTab.tsx` linha 45

O componente tem os toggles `isCpf` e `hasOver450`, mas o cálculo da `shopeeFee` nunca soma o adicional de R$3 quando ambos estão ativos. Compare com `calculateProduct.ts` e `roasUtils.ts` que fazem `cpfAdditional = (isCpf && hasOver450) ? 3 : 0`.

**Impacto:** O usuário vê margem e lucro inflados quando marca "CPF + mais de 450 pedidos".

**Correção:** Adicionar `const cpfAdditional = (isCpf && hasOver450) ? 3 : 0;` e somar no `shopeeFee`.

---

### 🐛 Bug 2: Tabs da Performance não permitem trocar

**Gravidade: Média**

**Local:** `src/pages/Performance.tsx` linha 185

```tsx
<Tabs value={hasExcelData ? 'excel' : 'api'} onValueChange={() => {}}>
```

O `onValueChange` é uma função vazia — o tab fica travado na aba "Excel" se há dados Excel. O usuário não consegue clicar para ver "Pedidos (API)".

**Correção:** Usar estado controlado com `useState` para gerenciar a tab ativa.

---

### 🐛 Bug 3: Insight "Orgânico" pode mostrar valor negativo

**Gravidade: Baixa**

**Local:** `src/components/performance/InsightsPanel.tsx` linha 35

Se `ads_gmv > vendas_pago` (possível quando GMV Ads inclui atribuição ampla), o cálculo `vendas_pago - ads_gmv` fica negativo. O insight mostra "R$ -500 veio de forma orgânica".

**Correção:** Adicionar guard `if (organicoReceita > 0)` — já existe na linha 36 mas a condição na linha 34 permite entrar. Na verdade olhando melhor, o guard existe. Porém `calcOrganicoVsAds` já trata com `Math.max(0, ...)`. A `InsightsPanel` não usa essa função. Deveria clampar também com `Math.max(0, ...)`.

---

### ⚠️ Melhoria 1: Excel period missing do nome do arquivo

**Local:** `src/lib/parsers/parseProductPerformanceExcel.ts` linha 47

Se o nome do arquivo não contém o padrão `YYYYMMDD_YYYYMMDD` (ex: arquivo renomeado), `period_start` e `period_end` ficam strings vazias. Isso causa datas inválidas no banco e `NaN` nos cálculos de `periodDays`.

**Correção:** Fallback para extrair data do conteúdo do Excel ou usar data de hoje como período.

---

### ⚠️ Melhoria 2: Performance paginação limitada a 20 produtos

**Local:** `src/pages/Performance.tsx` linhas 456, 517

A aba API limita a `sorted.slice(0, 20)` sem opção de ver mais. Vendedores com muitos SKUs perdem visibilidade.

---

### ⚠️ Melhoria 3: calcOrganicoVsAds assume ads_gmv ⊂ vendas_pago

**Local:** `src/lib/calcPerformance.ts` linha 12

`Math.min(ads_gmv, vendas_pago)` — correto como defesa, mas quando o GMV Ads (Broad) é maior que vendas_pago (ex: atribuição indireta inclui cross-sell), o insight fica enganoso pois mostra 0% orgânico quando na verdade o vendedor tem vendas orgânicas.

---

### ✅ O que está correto
- **Fórmulas de cálculo** (`calculateProduct`, `calcFullRoas`, `roasUtils`): Taxas, ROAS empate/saudável/ideal, acelera — todos consistentes entre si e passando nos testes
- **Parser Excel/CSV**: Merge de multi-line quoted fields funcionando
- **Auth flow**: ProtectedRoute, PaywallRoute, AdminRoute — lógica correta
- **RLS policies**: Tabelas protegidas adequadamente
- **Subscription check**: Edge function + client side guard implementados

---

### Plano de implementação

#### Arquivo 1: `src/components/calculators/ShopeeTab.tsx`
- Adicionar `cpfAdditional` = 3 quando CPF + 450 pedidos
- Incluir no `shopeeFee` e na lista `costs`

#### Arquivo 2: `src/pages/Performance.tsx`
- Trocar `onValueChange={() => {}}` por estado controlado com `useState`
- Permitir trocar entre tabs Excel e API

#### Arquivo 3: `src/components/performance/InsightsPanel.tsx`
- Clampar `organicoReceita` com `Math.max(0, ...)` para evitar valores negativos

#### Arquivo 4: `src/lib/parsers/parseProductPerformanceExcel.ts`
- Adicionar fallback de data quando nome do arquivo não contém período

