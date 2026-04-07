

## Plano: Atualizar informações do Paywall com dados da imagem de referência

Manter o layout atual (toggle mensal/anual, card único, hero, logo) mas atualizar textos, preços riscados, descontos e benefícios conforme a imagem.

### Mudanças em `src/constants/pricing.ts`
- Adicionar `monthlyOriginal: 59.90` e `yearlyOriginal: 497.00`
- Atualizar `yearlySavingPct: 60` (imagem mostra -60%)
- Adicionar labels: `monthlyOriginalLabel: "R$ 59,90"`, `yearlyOriginalLabel: "R$ 497,00"`, `monthlyDiscountPct: 33`

### Mudanças em `src/pages/Paywall.tsx`

**Benefícios atualizados conforme imagem:**
- Mensal: Precificação inteligente, Análise de Shopee Ads, Análise de produto, Análise de Anúncio, Performance por produto, Mapa de oportunidades, Dados que o painel da Shopee não mostra, 2 lojas conectadas
- Anual: mesmos + Múltiplas lojas (até 7), Suporte prioritário

**Seção de preço atualizada:**
- Mensal: mostrar preço original riscado "R$ 59,90/mês" + badge "-33% OFF" + preço R$ 39,90/mês + "Sem fidelidade · cancele quando quiser"
- Anual: mostrar preço original riscado "R$ 497,00/ano" + badge "-60% OFF" + preço R$ 197,00/ano + destaque "Apenas R$ 16,42/mês · você economiza R$ 300,00"

**Subtítulos dos planos:**
- Mensal: nome "Essencial - Mensal", subtítulo "Ideal para: quem está começando a vender na Shopee e quer clareza nos números."
- Anual: nome "Skalify Pro", subtítulo "Ideal para: sellers sérios que querem controle total e escalar com inteligência."

**CTA:**
- Mensal: "Quero começar agora →"
- Anual: "Quero o Skalify Pro →"

**Trust line:** "Garantia de 7 dias · Acesso imediato"

**Lojas conectadas:** Indicador visual abaixo do CTA: "2 lojas conectadas" (mensal) / "Até 7 lojas conectadas" (anual)

### Arquivo modificado
- `src/constants/pricing.ts`
- `src/pages/Paywall.tsx`

