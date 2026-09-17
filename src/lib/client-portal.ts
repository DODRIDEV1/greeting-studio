/* eslint-disable @typescript-eslint/no-explicit-any */
/** Accès client : espace SaaS filtré par abonnement, plan et rôle. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Row = Record<string, any>;

export type ClientWorkspace = {
  membership: Row | null;
  company: Row | null;
  role: Row | null;
  subscriptions: Row[];
  activeSubscriptions: Row[];
  apps: Row[];
  /** Services autorisés (plan ∩ rôle / permissions individuelles). */
  services: Row[];
  invoices: Row[];
};

const ACTIVE = new Set(["active", "trial"]);

function isRunning(sub: Row) {
  if (!ACTIVE.has(String(sub["status"] ?? "").toLowerCase())) return false;
  const end = sub["end_date"] as string | null;
  if (end && new Date(end) < new Date(new Date().toDateString())) return false;
  return true;
}

export const CLIENT_WORKSPACE_KEY = ["client", "workspace"] as const;

export function useClientWorkspace(userId: string | null | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: [...CLIENT_WORKSPACE_KEY, userId],
    queryFn: async (): Promise<ClientWorkspace> => {
      const empty: ClientWorkspace = {
        membership: null,
        company: null,
        role: null,
        subscriptions: [],
        activeSubscriptions: [],
        apps: [],
        services: [],
        invoices: [],
      };

      const { data: member } = await supabase
        .from("company_users")
        .select("*")
        .eq("profile_id", userId!)
        .maybeSingle();
      if (!member) return empty;

      const companyId = (member as Row)["company_id"] as string | null;

      const [companyRes, subsRes, plansRes, planServicesRes, planAppsRes, appsRes, servicesRes, roleRes, rolePermRes, userPermRes] =
        await Promise.all([
          companyId
            ? supabase.from("companies").select("*").eq("id", companyId).maybeSingle()
            : Promise.resolve({ data: null } as any),
          companyId
            ? supabase.from("subscriptions").select("*").eq("company_id", companyId)
            : Promise.resolve({ data: [] } as any),
          supabase.from("saas_plans").select("*"),
          supabase.from("plan_services").select("*"),
          supabase.from("plan_apps").select("*"),
          supabase.from("saas_apps").select("*").order("sort_order"),
          supabase.from("saas_services").select("*").order("sort_order"),
          (member as Row)["role_id"]
            ? supabase.from("saas_roles").select("*").eq("id", (member as Row)["role_id"]).maybeSingle()
            : Promise.resolve({ data: null } as any),
          (member as Row)["role_id"]
            ? supabase.from("role_permissions").select("*").eq("role_id", (member as Row)["role_id"])
            : Promise.resolve({ data: [] } as any),
          supabase.from("user_service_permissions").select("*").eq("company_user_id", (member as Row)["id"]),
        ]);

      const subscriptions = (subsRes.data ?? []) as Row[];
      const active = subscriptions.filter(isRunning);
      const planIds = new Set(active.map((s) => s["plan_id"]).filter(Boolean));

      const allApps = (appsRes.data ?? []) as Row[];
      const allServices = (servicesRes.data ?? []) as Row[];

      // Applications : celles des abonnements actifs + celles incluses dans leurs plans.
      const appIds = new Set<string>(active.map((s) => s["app_id"]).filter(Boolean) as string[]);
      for (const pa of (planAppsRes.data ?? []) as Row[]) {
        if (planIds.has(pa["plan_id"])) appIds.add(pa["plan_id"] && (pa["app_id"] as string));
      }
      const apps = allApps.filter((a) => appIds.has(a["id"]));

      // Services inclus dans les plans souscrits (ou tous ceux des applications actives si le plan n'en liste aucun).
      const planServiceIds = new Set<string>(
        ((planServicesRes.data ?? []) as Row[])
          .filter((ps) => planIds.has(ps["plan_id"]))
          .map((ps) => ps["service_id"] as string),
      );
      let allowed = planServiceIds.size
        ? allServices.filter((s) => planServiceIds.has(s["id"]))
        : allServices.filter((s) => appIds.has(s["app_id"]));

      // Filtrage par permissions individuelles, sinon par rôle.
      const userPerms = new Set(((userPermRes.data ?? []) as Row[]).map((p) => p["service_id"] as string));
      const rolePerms = new Set(((rolePermRes.data ?? []) as Row[]).map((p) => p["service_id"] as string));
      if (userPerms.size) allowed = allowed.filter((s) => userPerms.has(s["id"]));
      else if (rolePerms.size) allowed = allowed.filter((s) => rolePerms.has(s["id"]));

      let invoices: Row[] = [];
      if (subscriptions.length) {
        const { data } = await supabase
          .from("subscription_invoices")
          .select("*")
          .in("subscription_id", subscriptions.map((s) => s["id"]))
          .order("issue_date", { ascending: false });
        invoices = (data ?? []) as Row[];
      }

      const plans = (plansRes.data ?? []) as Row[];
      const withPlan = subscriptions.map((s) => ({
        ...s,
        plan: plans.find((p) => p["id"] === s["plan_id"]) ?? null,
        app: allApps.find((a) => a["id"] === s["app_id"]) ?? null,
      }));

      return {
        membership: member as Row,
        company: (companyRes.data ?? null) as Row | null,
        role: (roleRes.data ?? null) as Row | null,
        subscriptions: withPlan,
        activeSubscriptions: withPlan.filter(isRunning),
        apps,
        services: allowed.filter((s) => s["is_active"] !== false),
        invoices,
      };
    },
  });
}
