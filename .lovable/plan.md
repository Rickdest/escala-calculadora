

## Plano: Atualizar SHOPEE_PARTNER_KEY

A key fornecida (`shpk764a...514d`) tem 64 caracteres, passando a validação de 30+ chars no código.

### Ação
1. Deletar o secret `SHOPEE_PARTNER_KEY` atual (13 chars, inválido)
2. Re-adicionar com o valor completo de 64 caracteres
3. Testar clicando em "Conectar Loja Shopee" para confirmar que o redirecionamento funciona

### Resultado esperado
- A validação `key.length < 20` passa
- HMAC-SHA256 é gerado com a key correta
- A Shopee aceita a assinatura e exibe a tela de login/autorização

