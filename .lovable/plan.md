

## Como funciona hoje + problemas + melhorias

### Como está funcionando hoje

**Fonte dos dados:** Google Trends (interesse de busca relativo 0-100, últimos 12 meses, geo=BR) — não é volume absoluto, é "popularidade" daquela busca comparada a ela mesma no período.

**Como a keyword é extraída do nome do produto** (função `extractKeyword`):
1. Converte tudo pra minúsculo
2. Remove palavras: `kit, pacote, combo, unid, un, pç, pcs, peças, peca, pc`
3. Remove medidas: `100g, 2kg, 500ml, 30cm` etc.
4. Remove dimensões: `30x40`, `10x20`
5. Remove números soltos
6. Remove pontuação/símbolos
7. **Pega as 4 primeiras palavras restantes** e junta

### O problema com o exemplo real

Produto: `"Vestido Longo Feminino Safira Gringo com Costas Abertas Suplex Empina Bumbum Elegância e Conforto"`

**Resultado da extração atual:** `"vestido longo feminino safira"` ❌

Por quê está ruim:
- "Safira" é **nome de modelo/coleção** específico da loja — ninguém busca isso no Google
- "Gringo" também é jargão interno
- Pega só as 4 primeiras palavras na ordem original — não identifica o que é genérico vs marca/modelo
- Resultado: o Google Trends busca um termo que ninguém pesquisa → curva flat ou cheia de zeros, com pico artificial em 1 semana qualquer

**O que deveria buscar:** `"vestido longo feminino"` ou `"vestido suplex bumbum"` — termos que pessoas REALMENTE digitam no Google.

### Sintoma na sua tela atual

No print que você mandou (calça legging), o gráfico mostra **0 o ano todo e um pico súbito só na última semana**. Isso é o sinal clássico de termo mal extraído: o Google não tem dados suficientes pra aquela combinação exata, então retorna quase tudo zerado e cria "ruído" no fim.

### Melhorias propostas

#### 1. Algoritmo de extração inteligente (sem custo)

**Lógica nova em `extractKeyword`:**

a) **Lista de stop-words de e-commerce** (remover sempre):
```
elegância, conforto, premium, original, oficial, novo, novidade,
luxo, top, qualidade, importado, lançamento, exclusivo, perfeito,
ideal, melhor, super, ultra, mega, com, e, para, de, do, da, sem
```

b) **Lista de palavras "ruído de marketing"** (frases promocionais):
```
empina bumbum, costas abertas, modela corpo, levanta bumbum,
não marca, não transparente, anti-celulite
```

c) **Detector de "nome próprio/modelo"**: palavras capitalizadas no original que **não estão no dicionário básico de produto** (Safira, Gringo, Athena, Diana...) → remover

d) **Identificar o "núcleo do produto"** com base no padrão:
   `[Categoria] + [Modificador genérico] + [Público]`
   - Categoria: vestido, calça, camisa, tênis, bolsa, relógio, fone... (lista fixa de ~200 categorias comuns de e-commerce BR)
   - Modificador genérico: longo, curto, social, esportivo, infantil, canelada, suplex...
   - Público: feminino, masculino, infantil, unissex

   Resultado: pega categoria + 1 modificador + público = **3 palavras de ouro** que o Google Trends entende.

**Exemplo aplicado:**
- Input: `"Vestido Longo Feminino Safira Gringo com Costas Abertas Suplex Empina Bumbum Elegância e Conforto"`
- Categoria detectada: `vestido` ✓
- Modificadores genéricos detectados: `longo`, `suplex`
- Público: `feminino`
- Output: **`vestido longo feminino`** ✅

Outro exemplo:
- Input: `"Calça Legging Feminina Canelada Cintura Alta Push Up Premium"`
- Output: **`calça legging feminina`** ou **`legging cintura alta`** ✅

#### 2. Mostrar o termo extraído + permitir editar manualmente (UX)

No card "Termo analisado" (que já existe), adicionar:
- Ícone de lápis ✏️ ao lado do termo
- Ao clicar: input editável + botão "Reanalisar com este termo"
- Salva o termo customizado em `product_trends.keyword_override` (nova coluna)
- Próximas atualizações usam o override em vez de extrair de novo

Isso resolve casos que o algoritmo errar — usuário corrige uma vez e está bom.

#### 3. Validação de qualidade do resultado

Depois de buscar, se a curva tem **>80% de zeros**, mostrar aviso:
> "O termo '[X]' tem pouco volume no Google. Tente um termo mais genérico (ex: 'vestido feminino')."
> [Botão: Editar termo]

Isso dá feedback honesto em vez de mostrar gráfico falso.

#### 4. Sugestão de termos alternativos

Quando o resultado for fraco, sugerir 2-3 alternativas baseadas em remover palavras:
- Se `"vestido longo feminino safira"` falhar → sugerir `"vestido longo"`, `"vestido feminino"`, `"vestido suplex"`

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/fetch-product-trends/index.ts` | Reescrever `extractKeyword` com listas de stop-words + categorias + detector de modelo. Aceitar `keyword_override` no body. Detectar curva fraca (>80% zeros) e retornar flag `low_quality: true` |
| `supabase/migrations/...` | Adicionar coluna `keyword_override TEXT` em `products` (ou tabela auxiliar) |
| `src/hooks/useProductTrend.ts` | Expor `lowQuality`, `keywordOverride`, função `setKeywordOverride()` |
| `src/components/products/trend/ProductTrendTab.tsx` | Adicionar editor de termo (ícone ✏️), aviso de baixa qualidade, sugestões de termos alternativos |

### Trade-offs

- **Lista fixa de categorias** = não cobre 100% dos produtos. Pra produtos de nicho (ex: "umectação capilar") pode ainda errar → o editor manual cobre esses casos.
- **Override manual** = exige uma ação do usuário quando o algoritmo erra, mas é simples (1 clique + digitar).
- **Sem custo extra**: tudo continua usando Google Trends grátis com cookies.

### Pergunta antes de implementar

Confirma 2 coisas:
1. Quer eu implementar **tudo (algoritmo + editor + validação)** ou só o algoritmo melhor primeiro pra ver se resolve a maioria dos casos?
2. As listas de categorias/stop-words eu posso incluir as ~200 mais comuns de moda + casa + eletrônicos + beleza (cobre ~80% dos e-commerces BR), ou seu catálogo é focado em alguma vertical específica que eu deveria priorizar?

