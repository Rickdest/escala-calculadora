

## Plano: Corrigir lógica de Orçamento Diário Sugerido

### Problema
A fórmula atual é simplesmente `custoConversao × 5` (linha 719). Com custo por conversão de R$3,99, isso dá R$19,95 — um corte de 76% num orçamento que já está performando bem com 20,9 conv/dia. A sugestão não considera se a campanha é lucrativa ou não.

### Lógica corrigida

O orçamento sugerido deve ser contextual:

1. **Se ROAS atual ≥ ROAS saudável** → campanha lucrativa, sugerir manter ou otimizar levemente:
   - `sugerido = orçamento atual` (manter)
   - Mostrar texto "Orçamento adequado — campanha lucrativa"

2. **Se ROAS atual ≥ ROAS empate mas < saudável** → margem apertada:
   - `sugerido = custoConversao × convPorDia × (roasAtual / roasSaudavel)`
   - Redução proporcional para melhorar margem

3. **Se ROAS atual < ROAS empate** → prejuízo:
   - `sugerido = custoConversao × 5` (mínimo de proteção)
   - Reduzir ao mínimo viável até otimizar

4. **Piso**: nunca sugerir abaixo de `custoConversao × 5` (proteção do algoritmo)
5. **Teto**: nunca sugerir acima do orçamento atual (não faz sentido sugerir gastar mais sem dados)

### Mudanças no card visual

- Quando sugerido ≈ atual (diferença < 10%): mostrar "✅ Orçamento adequado" em verde, sem seta de redução
- Quando sugerido < atual: mostrar a seta atual → sugerido com o motivo ("Margem apertada" ou "Prejuízo — reduza")
- Adicionar linha explicativa: "Baseado em {convPorDia} conv/dia × R$ {custoConversao}/conv"

### Arquivo
- `src/components/roas/AdsDetailFullView.tsx` — linhas 718-722 (cálculo) e 1239-1266 (UI)

