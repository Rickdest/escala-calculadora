CREATE POLICY "Users can delete own shopee tokens"
ON public.shopee_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);