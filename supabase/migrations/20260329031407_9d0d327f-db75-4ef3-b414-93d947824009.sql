
-- Garantir cascade delete em todas as tabelas que referenciam auth.users

-- products
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_user_id_fkey,
  ADD CONSTRAINT products_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- stores
ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_user_id_fkey,
  ADD CONSTRAINT stores_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- price_history
ALTER TABLE public.price_history
  DROP CONSTRAINT IF EXISTS price_history_user_id_fkey,
  ADD CONSTRAINT price_history_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_roles
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ads_data
ALTER TABLE public.ads_data
  DROP CONSTRAINT IF EXISTS ads_data_user_id_fkey,
  ADD CONSTRAINT ads_data_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ads_reports
ALTER TABLE public.ads_reports
  DROP CONSTRAINT IF EXISTS ads_reports_user_id_fkey,
  ADD CONSTRAINT ads_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- product_ads_metrics
ALTER TABLE public.product_ads_metrics
  DROP CONSTRAINT IF EXISTS product_ads_metrics_user_id_fkey,
  ADD CONSTRAINT product_ads_metrics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- estoque_produtos
ALTER TABLE public.estoque_produtos
  DROP CONSTRAINT IF EXISTS estoque_produtos_user_id_fkey,
  ADD CONSTRAINT estoque_produtos_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- estoque_variacoes
ALTER TABLE public.estoque_variacoes
  DROP CONSTRAINT IF EXISTS estoque_variacoes_user_id_fkey,
  ADD CONSTRAINT estoque_variacoes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- estoque_movimentacoes
ALTER TABLE public.estoque_movimentacoes
  DROP CONSTRAINT IF EXISTS estoque_movimentacoes_user_id_fkey,
  ADD CONSTRAINT estoque_movimentacoes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- subscription_events: SET NULL (manter registro para auditoria fiscal)
ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_user_id_fkey;
ALTER TABLE public.subscription_events
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- subscriptions: SET NULL (manter registro para fins fiscais)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
