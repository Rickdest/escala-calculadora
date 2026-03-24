
## Correção do CSV Por Produto — posição não aparece

### Diagnóstico
O problema principal está no parser do CSV de produto.

No seu arquivo real existem **duas colunas parecidas**:
- `Posicionamento`
- `Posicionamento Médio`

Hoje o parser procura o primeiro header que contenha `posicionamento`, então ele está pegando a coluna errada (`Posicionamento`) em vez de `Posicionamento Médio`.

Resultado:
- o parser lê o valor `Todos` em vez de `28`
- `parseBRNumber('Todos')` vira `0`
- `avgPosition` fica `null`
- `posicao_media` não é salva
- o card continua mostrando `—`

Isso explica:
- importação automática não atualizar
- importação manual também não atualizar
- toast aparecer como sucesso simples, sem posição detectada

### O que vou ajustar

#### 1. `src/lib/shopeeAdsParser.ts`
Corrigir a detecção da coluna de posição para **priorizar somente o campo certo**:
- buscar primeiro por `posicionamento médio`
- aceitar variações como `posicionamento medio`, `avg position`, `média de posição`
- **não usar** o header genérico `Posicionamento` como coluna de posição média
- manter fallback por índice 20/21 apenas como segurança, não como regra principal

Também vou adicionar uma lógica mais explícita:
```text
1. procurar header exato de posição média
2. se não achar, procurar aliases equivalentes
3. só então usar fallback por índice
```

#### 2. `src/hooks/useAdsData.ts`
Melhorar o fluxo de importação do CSV de produto:
- se `avgPosition` vier preenchido, sempre salvar `posicao_media` e `posicao_importada`
- manter o update no row existente quando importar manualmente pelo card
- manter a busca por `shopee_product_id` no import automático
- trocar o toast genérico por um toast de sucesso com a posição quando detectada
- se o CSV for do tipo produto mas não tiver posição válida, mostrar aviso mais claro para facilitar diagnóstico

#### 3. `src/components/roas/AdsTab.tsx`
Ajustar o banner visual pós-import:
- só mostrar o banner “Posição detectada” quando a importação realmente retornar posição válida
- evitar falso positivo visual quando o parser não extrair `avgPosition`

### Resultado esperado
Depois da correção, ao subir esse CSV:

```text
Product-Ad-Data-100313224-23_02_2026-23_03_2026.csv
```

o sistema deverá:
- identificar automaticamente que é CSV **Por Produto**
- localizar a coluna `Posicionamento Médio`
- extrair o valor `28`
- salvar em `posicao_media`
- marcar `posicao_importada = true`
- atualizar o card para mostrar `#28`
- destacar essa posição na área de análise

### Arquivos envolvidos
- `src/lib/shopeeAdsParser.ts`
- `src/hooks/useAdsData.ts`
- `src/components/roas/AdsTab.tsx`

### Observação técnica
Não parece ser problema do banco nem de RLS. O erro está na leitura do CSV antes de salvar.

### Validação após implementar
Vou validar estes 3 cenários:
1. importar o CSV de produto pelo botão principal
2. importar manualmente pelo box de posição do card
3. confirmar que o valor exibido vem de `Posicionamento Médio` e não de `Posicionamento`
