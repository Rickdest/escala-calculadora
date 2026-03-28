
CREATE POLICY "Deny all inserts for authenticated users"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny all updates for authenticated users"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all deletes for authenticated users"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (false);
