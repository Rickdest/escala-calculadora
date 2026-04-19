---
name: Storage Bucket Listing Policies
description: Buckets públicos product-images e banners — listing restrito por dono/admin, URLs públicas continuam funcionando para img src
type: constraint
---

Buckets de Storage públicos (`product-images`, `banners`) NÃO devem permitir listing aberto via `storage.objects` SELECT.

- **product-images**: SELECT autenticado restrito a `(storage.foldername(name))[1] = auth.uid()::text` — usuário só vê suas próprias imagens. URLs `/storage/v1/object/public/...` continuam acessíveis para renderização em `<img src>` (anônimo).
- **banners**: SELECT autenticado restrito a `has_role('admin')`. URLs públicas continuam funcionando para o app exibir.

Nunca recriar policy genérica `bucket_id = 'product-images'` sem filtro de pasta. Isso permite enumeração cross-user.
