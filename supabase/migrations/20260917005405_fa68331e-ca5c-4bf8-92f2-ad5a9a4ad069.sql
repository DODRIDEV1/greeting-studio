
CREATE OR REPLACE FUNCTION public.my_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_users
  WHERE profile_id = auth.uid() AND is_active AND company_id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.my_company_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.my_company_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_company_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.company_users WHERE profile_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.my_company_user_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.my_company_user_ids() TO authenticated;

CREATE POLICY "members read own company users" ON public.company_users
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR company_id IN (SELECT public.my_company_ids()));

CREATE POLICY "members read own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_company_ids()));

CREATE POLICY "members read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));

CREATE POLICY "members read own sub invoices" ON public.subscription_invoices
  FOR SELECT TO authenticated
  USING (subscription_id IN (
    SELECT id FROM public.subscriptions WHERE company_id IN (SELECT public.my_company_ids())
  ));

CREATE POLICY "members read own service perms" ON public.user_service_permissions
  FOR SELECT TO authenticated
  USING (company_user_id IN (SELECT public.my_company_user_ids()));

CREATE POLICY "auth read apps" ON public.saas_apps FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read services" ON public.saas_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read plans" ON public.saas_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read plan apps" ON public.plan_apps FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read plan services" ON public.plan_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read roles" ON public.saas_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read role perms" ON public.role_permissions FOR SELECT TO authenticated USING (true);
