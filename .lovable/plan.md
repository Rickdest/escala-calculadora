

## Plano: Restaurar "Antes vs Depois" e "Fontes de Tráfego" na aba Métricas

### Problema
Esses dados somem porque ao salvar/carregar o Excel do banco, `dataPrimeiraVenda` é salvo como `null` e `fontes` como `[]`. Os componentes `AntesVsDepois` e `FontesTrafegoChart` retornam `null` quando esses campos estão vazios.

### Solução

**Arquivo: `src/components/roas/AdsDetailFullView.tsx`**

1. **Salvar campos faltantes** — No `handleExcelUpload` (linha ~582-590), adicionar `dataPrimeiraVenda` e `fontes` ao `excel_summary`:
   ```
   excel_summary: {
     ...existente,
     dataPrimeiraVenda: parsed.dataPrimeiraVenda,
     fontes: parsed.fontes,
   }
   ```

2. **Carregar campos faltantes** — No `useEffect` de load (linha ~657-670), restaurar `dataPrimeiraVenda` e `fontes` do summary salvo:
   ```
   dataPrimeiraVenda: summary.dataPrimeiraVenda || null,
   fontes: summary.fontes || [],
   ```

### Detalhes técnicos
- Não precisa de migration — os campos já são JSONB e aceitam qualquer estrutura
- Sem alteração de lógica de negócio, apenas persistência de 2 campos extras
- Apenas `AdsDetailFullView.tsx` é editado

