## Implementação: Exportar PDF (Resumido + Completo)

### Arquivos

**1. `package.json`** — adicionar `jspdf` e `jspdf-autotable`.

**2. `src/lib/pdfReport.ts`** (novo) — gerador de PDF real com jsPDF:
- `generateProductsPDF(data, store, mode: 'resumido' | 'completo')`
- **Cabeçalho**: nome da loja, data de geração, "Skalify" no topo
- **Resumo executivo** (cards): nº produtos, receita potencial, lucro total, margem média ponderada, meta da loja, distribuição (acima/abaixo da meta)
- **Modo resumido** (1-2 páginas, para cliente):
  - Resumo executivo
  - Top 5 mais lucrativos (tabela compacta: produto, venda, lucro, margem)
  - Top 5 problemas (margem abaixo da meta)
- **Modo completo** (para sócio/análise):
  - Resumo executivo
  - Top 5 mais lucrativos + Top 5 problemas
  - Tabela completa de TODOS os produtos via `jspdf-autotable` (Produto, Custo, Venda, Taxa Shopee, Impostos, Lucro, Margem, Estoque) com cores: verde (≥ meta), amarelo (próximo), vermelho (abaixo)
- **Rodapé** em todas as páginas: "Skalify • página X de Y • gerado em DD/MM/AAAA"
- A4 retrato, margens 14mm, page break automático
- Download direto: `doc.save('${storeName}_relatorio_${data}.pdf')`

**3. `src/lib/exportUtils.ts`** — `exportToPDF` agora delega para `pdfReport.ts` (modo completo por padrão); manter CSV intacto. Remover/deprecar `generatePDFContent` (HTML print).

**4. `src/pages/Products.tsx`** — substituir o item único de PDF no DropdownMenu por dois itens:
  - "Exportar PDF (resumido)" → cliente
  - "Exportar PDF (completo)" → sócio/análise
  Usar `import()` dinâmico para o gerador PDF (evita +80kb no first load).

### Detalhes técnicos

- Cores: verde `#22c55e`, amarelo `#eab308`, vermelho `#ef4444`, accent Skalify `#e85d00`
- Cálculos: usar `calculateProduct` existente para garantir consistência com a UI
- Margem média ponderada: `Σ(lucro)/Σ(receita) × 100` (não média aritmética)
- Filtrar produtos `draft === true` da exportação
- Toast `sonner` ao concluir: "PDF gerado com sucesso"
- Tratamento de erro com toast caso jsPDF falhe ao carregar

### Trade-offs

- ✅ PDF real, baixa direto no celular/desktop/PWA
- ✅ Visual profissional pronto para enviar
- ✅ Dynamic import → sem peso no bundle inicial
- ⚠️ Sem logo PNG embarcada na v1 (só texto "Skalify" estilizado). Pode adicionar depois se você fornecer SVG/PNG em `/public`.
