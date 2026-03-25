

## Auditoria de Segurança — Plano de Implementação

### Estado Atual

**RLS**: Todas as tabelas já possuem RLS habilitado com policies para SELECT/INSERT/UPDATE/DELETE filtrando por `auth.uid() = user_id`. INSERT em tabelas críticas já exige `has_active_subscription()`. O estado atual é **sólido** — não há tabelas sem RLS nem policies faltantes.

**Secrets**: Nenhuma chave hardcoded encontrada no código. O `.env` não está no `.gitignore` (precisa adicionar). O client.ts usa `import.meta.env` corretamente.

**IDOR**: As operações em `useAdsData` (link, unlink, delete, update) não filtram por `user_id` no `.eq()` — dependem apenas do RLS. Funciona, mas é defesa em camada única.

**CSV**: Sem validação de tamanho de arquivo, limite de linhas, ou sanitização de strings.

**Race conditions**: Sem proteção contra double-click em importações/vinculações.

---

### Correções por Prioridade

#### 1. `.gitignore` — Adicionar `.env`
Adicionar `.env` ao `.gitignore`.

#### 2. IDOR — Filtrar por `user_id` nas operações (useAdsData.ts)
Em `linkProduct`, `unlinkProduct`, `deleteAdsData`, e `importProductCSV` (quando faz update por ID), adicionar `.eq('user_id', user.id)` ao lado de `.eq('id', adsDataId)`.

#### 3. CSV — Validação de segurança (shopeeAdsParser.ts)
Criar função `validateCSVSecurity(file, text)` que verifica:
- Tamanho máximo: 5MB
- Extensão: `.csv`
- Máximo 502 linhas
- Campo máximo: 500 caracteres

Criar função `sanitizeString(value)` que remove tags HTML, `javascript:`, e event handlers. Aplicar em campos de texto extraídos (productName, status, bidMethod, etc).

#### 4. Race conditions — Flag de operação em andamento (useAdsData.ts)
Adicionar ref `operationInProgress` para bloquear execução simultânea em `importGeneralCSV`, `importProductCSV`, `linkProduct`, `unlinkProduct`, `deleteAdsData`, `deleteAll`.

#### 5. Validação numérica (shopeeAdsParser.ts)
Criar `validateNumeric(value, fieldName)` que:
- Retorna 0 para NaN/Infinity
- Clamp negativo para contadores (impressões, cliques)
- Limita monetários a R$99M
- Aplica nos valores parseados antes de retornar métricas

#### 6. Rate limiting client-side (useAdsData.ts)
Limitar importações a 5 por minuto com contador + timer.

#### 7. Validação nos modais de importação
Aplicar `validateCSVSecurity` em `ImportAdsModal.tsx`, `ProductAdsSection.tsx`, e `AdsTab.tsx` (onde `handleFileSelect` é chamado) antes de processar o CSV.

#### 8. Desabilitar botões durante operações
Expor `importing` do hook `useAdsData` para desabilitar botões na UI durante operações.

---

### Detalhes Técnicos

**Arquivos modificados:**
- `.gitignore` — adicionar `.env`
- `src/lib/shopeeAdsParser.ts` — `validateCSVSecurity`, `sanitizeString`, `validateNumeric`
- `src/hooks/useAdsData.ts` — filtro IDOR, race condition flag, rate limiting, expor `importing`
- `src/components/roas/ImportAdsModal.tsx` — validação CSV antes de processar
- `src/components/forms/ProductAdsSection.tsx` — validação CSV
- `src/components/roas/AdsTab.tsx` — validação CSV, desabilitar botões

**Não são necessárias migrações SQL** — as policies existentes já cobrem todos os cenários. A constraint única de deduplicação (índice único) seria uma melhoria, mas o sistema atual já faz deduplicação por período no código e o risco de race condition real é baixo dado que é single-user.

