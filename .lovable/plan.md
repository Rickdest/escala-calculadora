

## Plano: Dar mais destaque à integração Shopee na aba Ads

### Problema
O botão "Conectar Shopee para importar Ads" fica escondido lá embaixo, após os 3 passos do CSV e o botão de importar CSV. A integração via API deveria ter mais destaque pois é a opção mais prática.

### Mudança

**Arquivo: `src/components/roas/AdsEmptyState.tsx`**

Reorganizar a ordem para colocar a integração Shopee **primeiro**, como opção principal:

1. **Ícone + título** — Manter o ícone e título atuais
2. **Botão Shopee como primário** — Mover para cima, com estilo `bg-[#EE4D2D]` (fundo laranja Shopee, texto branco), tamanho h-12, como CTA principal. Adicionar subtexto "Importe ROAS, campanhas e métricas automaticamente"
3. **Separador "ou importe manualmente"** — após o botão Shopee
4. **Passos do CSV colapsados** — Mover os 3 passos + botão CSV para baixo, com visual secundário (outline)

### Layout final (não conectado)
```text
[Ícone BarChart3]
"Analise seus Shopee Ads"
"Conecte sua conta ou importe CSV"

[🟠 Conectar Shopee para importar Ads]  ← primário, bg laranja
"Importe automaticamente via API"

── ou importe manualmente ──

[1] Acesse o Seller Center
[2] Vá em Marketing → Shopee Ads  
[3] Exporte o CSV

[Importar CSV]  ← outline/secundário
```

### Arquivo modificado
- `src/components/roas/AdsEmptyState.tsx`

