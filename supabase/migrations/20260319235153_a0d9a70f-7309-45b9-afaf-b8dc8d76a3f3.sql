-- Step 1: Drop policies that depend on old has_role(uuid, app_role)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage education content" ON public.education_content;

-- Step 2: Drop old 2-param function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Step 3: Create new 1-param has_role using auth.uid() internally
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- Step 4: Recreate policies with new signature
CREATE POLICY "Admins can manage education content" ON public.education_content
  FOR ALL TO authenticated
  USING (has_role('admin'::app_role))
  WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role('admin'::app_role))
  WITH CHECK (has_role('admin'::app_role));

-- Step 5: Create subscription check function
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND (
        status = 'active'
        OR (status = 'trialing' AND trial_end > now())
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND status = 'trial'
      AND trial_fim > now()
  )
$$;

-- Step 6: Add subscription enforcement to write policies

-- PRODUCTS
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
    AND has_active_subscription()
  );

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
    AND has_active_subscription()
  );

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND has_active_subscription());

-- STORES
DROP POLICY IF EXISTS "Users can insert own stores" ON public.stores;
CREATE POLICY "Users can insert own stores" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
CREATE POLICY "Users can update own stores" ON public.stores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;
CREATE POLICY "Users can delete own stores" ON public.stores
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND has_active_subscription());

-- ESTOQUE_PRODUTOS
DROP POLICY IF EXISTS "Users can insert own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can insert own estoque_produtos" ON public.estoque_produtos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can update own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can update own estoque_produtos" ON public.estoque_produtos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can delete own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can delete own estoque_produtos" ON public.estoque_produtos
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND has_active_subscription());

-- ESTOQUE_VARIACOES
DROP POLICY IF EXISTS "Users can insert own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can insert own estoque_variacoes" ON public.estoque_variacoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can update own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can update own estoque_variacoes" ON public.estoque_variacoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can delete own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can delete own estoque_variacoes" ON public.estoque_variacoes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND has_active_subscription());

-- ESTOQUE_MOVIMENTACOES
DROP POLICY IF EXISTS "Users can insert own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can insert own estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can delete own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can delete own estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND has_active_subscription());

-- Step 7: Add validation constraints on education_content
ALTER TABLE public.education_content
  ADD CONSTRAINT education_content_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT education_content_description_length CHECK (char_length(description) <= 1000);