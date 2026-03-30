

## Plano: Atualizar SHOPEE_KEY com a nova Partner Key

A nova chave do sandbox é diferente da anterior. Preciso atualizar o secret `SHOPEE_KEY` com o valor correto.

### Ação única

1. **Atualizar o secret `SHOPEE_KEY`** com o novo valor:
   `shpk69495376706653476c50746651535a4546454e5956706e73727663575063`

2. **Redesplegar** as edge functions `shopee-auth`, `shopee-callback` e `shopee-sync` para que peguem o novo secret.

### Detalhes técnicos
- Nenhuma alteração de código necessária — apenas o valor do secret muda.
- O Partner ID continua 1231044.
- O host do sandbox continua `partner.test-stable.shopeemobile.com`.

