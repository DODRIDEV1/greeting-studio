import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Calculator,
  FileText,
  LayoutGrid,
  LogOut,
  Lock,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/espace")({
  component: EspacePage,
  head: () => ({
    meta: [
      { title: "Espace client SaaS — DODRICOM" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Espace client DODRICOM : accédez aux programmes SaaS activés pour votre société." },
      { property: "og:title", content: "Espace client SaaS — DODRICOM" },
      { property: "og:description", content: "Accédez aux programmes SaaS activés pour votre société." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ICONS: Record<string, LucideIcon> = {
  facturation: FileText,
  comptabilite: Calculator,
  rh: Users,
  stock: Boxes,
  finance: Wallet,
};

type App = { id: string; code: string; name: string; description: string | null };
type Service = { id: string; app_id: string; name: string; description: string | null };

function useWorkspace(userId?: string) {
  return useQuery({
    queryKey: ["espace", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: member, error } = await supabase
        .from("company_users")
        .select("id, full_name, is_active, company_id")
        .eq("profile_id", userId!)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!member?.company_id) return { member: null, company: null, apps: [] as App[], services: [] as Service[] };

      const [{ data: company }, { data: subs }] = await Promise.all([
        supabase.from("companies").select("id, name, status, start_date, end_date").eq("id", member.company_id).maybeSingle(),
        supabase.from("subscriptions").select("app_id, status").eq("company_id", member.company_id).eq("status", "active"),
      ]);
      const appIds = [...new Set((subs ?? []).map((s) => s.app_id).filter(Boolean) as string[])];
      const [{ data: apps }, { data: services }] = appIds.length
        ? await Promise.all([
            supabase.from("saas_apps").select("id, code, name, description").in("id", appIds).eq("is_active", true).order("sort_order"),
            supabase.from("saas_services").select("id, app_id, name, description").in("app_id", appIds).eq("is_active", true).is("parent_id", null).order("sort_order"),
          ])
        : [{ data: [] }, { data: [] }];
      return { member, company, apps: (apps ?? []) as App[], services: (services ?? []) as Service[] };
    },
  });
}

function companyActive(c: { status: string; start_date: string | null; end_date: string | null } | null) {
  if (!c || c.status !== "active") return false;
  const t = new Date().toISOString().slice(0, 10);
  if (c.start_date && c.start_date > t) return false;
  if (c.end_date && c.end_date < t) return false;
  return true;
}

function EspacePage() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useWorkspace(user?.id);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);
  useEffect(() => {
    if (user && user.roles.length > 0) navigate({ to: "/admin", replace: true });
  }, [user, navigate]);

  const signOut = async () => { await logout(); navigate({ to: "/", replace: true }); };

  if (!ready || isLoading || !user) return <Center>Chargement de votre espace…</Center>;
  if (error) return <Center>Impossible de charger votre espace pour le moment.</Center>;

  if (!data?.member || !data.company) {
    return (
      <Center>
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold text-white">Aucun accès SaaS trouvé</p>
          <p className="text-sm text-white/60">Votre compte n'est rattaché à aucune société cliente. Contactez DODRICOM pour activer votre accès.</p>
          <div className="flex justify-center gap-2">
            <Link to="/contact" className="btn-gradient inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">Nous contacter</Link>
            <button onClick={signOut} className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80">Se déconnecter</button>
          </div>
        </div>
      </Center>
    );
  }

  if (!companyActive(data.company)) {
    return (
      <Center>
        <div className="glass max-w-md space-y-4 p-8">
          <Lock className="mx-auto h-10 w-10 text-amber-300" />
          <p className="text-lg font-semibold text-white">Abonnement expiré</p>
          <p className="text-sm text-white/70">
            Merci de vous abonner pour bénéficier du service. L'abonnement de <b>{data.company.name}</b> n'est plus actif
            {data.company.end_date ? ` depuis le ${new Date(data.company.end_date).toLocaleDateString("fr-FR")}` : ""}.
          </p>
          <div className="flex justify-center gap-2">
            <Link to="/contact" className="btn-gradient inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">Renouveler l'abonnement</Link>
            <button onClick={signOut} className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80">Se déconnecter</button>
          </div>
        </div>
      </Center>
    );
  }

  const app = data.apps.find((a) => a.id === current) ?? null;
  const services = app ? data.services.filter((s) => s.app_id === app.id) : [];

  return (
    <div className="flex min-h-screen bg-[#05060A] text-white">
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-white/[0.02] p-4">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Société</p>
          <p className="font-semibold">{data.company.name}</p>
          <p className="text-xs text-white/50">{data.member.full_name}</p>
        </div>
        <nav className="flex-1 space-y-1">
          <SideBtn active={!app} icon={LayoutGrid} label="Accueil" onClick={() => setCurrent(null)} />
          <p className="px-3 pb-1 pt-4 text-[11px] uppercase tracking-widest text-white/40">Mes programmes</p>
          {data.apps.map((a) => (
            <SideBtn key={a.id} active={current === a.id} icon={ICONS[a.code] ?? LayoutGrid} label={a.name} onClick={() => setCurrent(a.id)} />
          ))}
          {data.apps.length === 0 && <p className="px-3 text-xs text-white/50">Aucun programme activé.</p>}
        </nav>
        <button onClick={signOut} className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </aside>

      <main className="flex-1 p-8">
        {!app ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Bienvenue, {data.member.full_name}</h1>
              <p className="text-sm text-white/60">
                Abonnement actif{data.company.end_date ? ` jusqu'au ${new Date(data.company.end_date).toLocaleDateString("fr-FR")}` : ""}. Choisissez un programme.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.apps.map((a) => {
                const Icon = ICONS[a.code] ?? LayoutGrid;
                return (
                  <button key={a.id} onClick={() => setCurrent(a.id)} className="glass p-5 text-left transition hover:bg-white/[0.06]">
                    <Icon className="mb-3 h-6 w-6 text-violet-300" />
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-white/50">{a.description ?? ""}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">{app.name}</h1>
              <p className="text-sm text-white/60">{app.description ?? ""}</p>
            </div>
            {services.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((s) => (
                  <div key={s.id} className="glass p-5">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-white/50">{s.description ?? ""}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass p-8 text-sm text-white/60">Les modules de ce programme seront bientôt disponibles ici.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SideBtn({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-violet-500/20 text-white" : "text-white/70 hover:bg-white/5"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-[#05060A] px-4 text-center text-white/70">{children}</div>;
}
