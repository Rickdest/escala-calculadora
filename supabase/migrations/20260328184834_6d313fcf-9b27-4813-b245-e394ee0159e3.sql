
CREATE POLICY "Deny all inserts for authenticated users"
  ON public.subscription_events FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny all updates for authenticated users"
  ON public.subscription_events FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all deletes for authenticated users"
  ON public.subscription_events FOR DELETE
  TO authenticated
  USING (false);
