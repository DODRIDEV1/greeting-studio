import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus, Users, X, KeyRound, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { createCompanyMember, setCompanyMemberPassword } from "@/lib/saas-admin.functions";

export const Route = createFileRoute("/admin/saas")({
  component: SaasAdminPage,
  head: () => ({
    meta: [
      { title: "Gestion SaaS — DODRICOM Back Office" },
      { name: "description", content: "Sociétés clientes, utilisateurs et abonnements aux programmes SaaS DODRICOM." },
      { property: "og:title", content: "Gestion SaaS — DODRICOM" },
      { property: "og:description", content: "Gérez les sociétés, leurs utilisateurs et leurs programmes SaaS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type App = { id: string; code: string; name: string };
type Company = { id: string; name: string; email: string | null; phone: string | null; city: string | null; start_date: string | null; end_date: string | null; status: string };
type Sub = { id: string; company_id: string | null; app_id: string | null; status: string };
type Member = { id: string; company_id: string | null; profile_id: string | null; full_name: string; email: string | null; is_active: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const inOneYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

export function isCompanyActive(c: Pick<Company, "status" | "end_date" | "start_date">) {
  if (c.status !== "active") return false;
  const t = today();
  if (c.start_date && c.start_date > t) return false;
  if (c.end_date && c.end_date < t) return false;
  return true;
}

function useSaasAdmin() {
  return useQuery({
    queryKey: ["saas-admin"],
    queryFn: async () => {
      const [a, c, s, m] = await Promise.all([
        supabase.from("saas_apps").select("id, code, name").eq("is_active", true).order("sort_order"),
        supabase.from("companies").select("id, name, email, phone, city, start_date, end_date, status").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("id, company_id, app_id, status"),
        supabase.from("company_users").select("id, company_id, profile_id, full_name, email, is_active").order("created_at"),
      ]);
      const err = a.error || c.error || s.error || m.error;
      if (err) throw err;
      return { apps: a.data as App[], companies: c.data as Company[], subs: s.data as Sub[], members: m.data as Member[] };
    },
  });
}

const input = "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/30";
const btn = "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium";

function SaasAdminPage() {
  const { data, isLoading, error } = useSaasAdmin();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <AdminShell title="Gestion SaaS" breadcrumbs={[{ label: "Gestion SaaS" }]}>
      {isLoading && <p className="text-white/60">Chargement…</p>}
      {error && <p className="text-red-300">Erreur : {(error as Error).message}</p>}
      {data && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="glass p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">Sociétés ({data.companies.length})</h2>
              <button className={`${btn} btn-gradient`} onClick={() => { setCreating(true); setSelected(null); }}>
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            <ul className="space-y-2">
              {data.companies.map((c) => {
                const active = isCompanyActive(c);
                const n = data.subs.filter((s) => s.company_id === c.id).length;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => { setSelected(c.id); setCreating(false); }}
                      className={`w-full rounded-xl border px-3 py-2 text-left ${selected === c.id ? "border-white/30 bg-white/[0.08]" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{c.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                          {active ? "Actif" : "Expiré"}
                        </span>
                      </div>
                      <p className="text-xs text-white/50">{n} programme(s) · fin {c.end_date ?? "—"}</p>
                    </button>
                  </li>
                );
              })}
              {data.companies.length === 0 && <p className="text-sm text-white/50">Aucune société.</p>}
            </ul>
          </div>

          <div>
            {creating && <CompanyForm apps={data.apps} onDone={(id) => { setCreating(false); setSelected(id); }} onCancel={() => setCreating(false)} />}
            {!creating && selected && data.companies.find((c) => c.id === selected) && (
              <CompanyDetail
                key={selected}
                company={data.companies.find((c) => c.id === selected)!}
                apps={data.apps}
                subs={data.subs.filter((s) => s.company_id === selected)}
                members={data.members.filter((m) => m.company_id === selected)}
              />
            )}
            {!creating && !selected && (
              <div className="glass grid place-items-center p-12 text-center text-white/60">
                <Building2 className="mb-3 h-8 w-8" />
                Sélectionnez une société ou ajoutez-en une nouvelle.
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function AppPicker({ apps, value, onChange }: { apps: App[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={`${btn} border border-white/10 text-white/70`} onClick={() => onChange(value.length === apps.length ? [] : apps.map((a) => a.id))}>
        {value.length === apps.length ? "Tout retirer" : "Tout sélectionner"}
      </button>
      {apps.map((a) => {
        const on = value.includes(a.id);
        return (
          <button
            type="button"
            key={a.id}
            onClick={() => onChange(on ? value.filter((x) => x !== a.id) : [...value, a.id])}
            className={`${btn} border ${on ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-white/60"}`}
          >
            {a.name}
          </button>
        );
      })}
    </div>
  );
}

function CompanyForm({ apps, onDone, onCancel }: { apps: App[]; onDone: (id: string) => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", start_date: today(), end_date: inOneYear() });
  const [appIds, setAppIds] = useState<string[]>([]);
  const m = useMutation({
    mutationFn: async () => {
      if (!f.name.trim()) throw new Error("Nom de la société requis.");
      const { data: c, error } = await supabase
        .from("companies")
        .insert({ ...f, name: f.name.trim(), email: f.email || null, phone: f.phone || null, city: f.city || null, status: "active" })
        .select("id")
        .single();
      if (error) throw error;
      if (appIds.length) {
        const { error: e2 } = await supabase.from("subscriptions").insert(
          appIds.map((app_id) => ({ company_id: c.id, app_id, start_date: f.start_date, end_date: f.end_date, status: "active", period: "yearly" })),
        );
        if (e2) throw e2;
      }
      return c.id as string;
    },
    onSuccess: async (id) => { await qc.invalidateQueries({ queryKey: ["saas-admin"] }); onDone(id); },
  });

  return (
    <div className="glass space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Nouvelle société</h2>
        <button onClick={onCancel} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/60">Nom *<input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="text-xs text-white/60">Email<input className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label className="text-xs text-white/60">Téléphone<input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="text-xs text-white/60">Ville<input className={input} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
        <label className="text-xs text-white/60">Début d'abonnement<input type="date" className={input} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
        <label className="text-xs text-white/60">Fin d'abonnement<input type="date" className={input} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></label>
      </div>
      <div>
        <p className="mb-2 text-xs text-white/60">Programmes SaaS activés</p>
        <AppPicker apps={apps} value={appIds} onChange={setAppIds} />
      </div>
      {m.error && <p className="text-sm text-red-300">{(m.error as Error).message}</p>}
      <button disabled={m.isPending} onClick={() => m.mutate()} className={`${btn} btn-gradient`}>
        {m.isPending ? "Création…" : "Créer et activer l'abonnement"}
      </button>
    </div>
  );
}

function CompanyDetail({ company, apps, subs, members }: { company: Company; apps: App[]; subs: Sub[]; members: Member[] }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["saas-admin"] });
  const [dates, setDates] = useState({ start_date: company.start_date ?? today(), end_date: company.end_date ?? inOneYear(), status: company.status });
  const [appIds, setAppIds] = useState<string[]>(subs.map((s) => s.app_id!).filter(Boolean));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").update(dates).eq("id", company.id);
      if (error) throw error;
      const current = subs.map((s) => s.app_id);
      const toRemove = subs.filter((s) => !appIds.includes(s.app_id!)).map((s) => s.id);
      const toAdd = appIds.filter((id) => !current.includes(id));
      if (toRemove.length) { const r = await supabase.from("subscriptions").delete().in("id", toRemove); if (r.error) throw r.error; }
      if (toAdd.length) {
        const r = await supabase.from("subscriptions").insert(toAdd.map((app_id) => ({ company_id: company.id, app_id, start_date: dates.start_date, end_date: dates.end_date, status: "active", period: "yearly" })));
        if (r.error) throw r.error;
      }
      const u = await supabase.from("subscriptions").update({ start_date: dates.start_date, end_date: dates.end_date }).eq("company_id", company.id);
      if (u.error) throw u.error;
    },
    onSuccess: refresh,
  });

  const active = isCompanyActive({ ...company, ...dates });

  return (
    <div className="space-y-6">
      <div className="glass space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{company.name}</h2>
            <p className="text-xs text-white/50">{[company.email, company.phone, company.city].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
            {active ? "Abonnement actif" : "Abonnement expiré / suspendu"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-white/60">Début<input type="date" className={input} value={dates.start_date} onChange={(e) => setDates({ ...dates, start_date: e.target.value })} /></label>
          <label className="text-xs text-white/60">Fin<input type="date" className={input} value={dates.end_date} onChange={(e) => setDates({ ...dates, end_date: e.target.value })} /></label>
          <label className="text-xs text-white/60">Statut
            <select className={input} value={dates.status} onChange={(e) => setDates({ ...dates, status: e.target.value })}>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
            </select>
          </label>
        </div>
        <div>
          <p className="mb-2 text-xs text-white/60">Programmes SaaS activés</p>
          <AppPicker apps={apps} value={appIds} onChange={setAppIds} />
        </div>
        {save.error && <p className="text-sm text-red-300">{(save.error as Error).message}</p>}
        {save.isSuccess && <p className="text-sm text-emerald-300">Enregistré.</p>}
        <button disabled={save.isPending} onClick={() => save.mutate()} className={`${btn} btn-gradient`}>
          {save.isPending ? "Enregistrement…" : "Enregistrer l'abonnement"}
        </button>
      </div>

      <Members companyId={company.id} members={members} onChange={refresh} />
    </div>
  );
}

function Members({ companyId, members, onChange }: { companyId: string; members: Member[]; onChange: () => void }) {
  const create = useServerFn(createCompanyMember);
  const setPwd = useServerFn(setCompanyMemberPassword);
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "" });
  const add = useMutation({
    mutationFn: () => create({ data: { companyId, ...f } }),
    onSuccess: () => { setF({ fullName: "", email: "", phone: "", password: "" }); onChange(); },
  });
  const toggle = useMutation({
    mutationFn: async (m: Member) => { const r = await supabase.from("company_users").update({ is_active: !m.is_active }).eq("id", m.id); if (r.error) throw r.error; },
    onSuccess: onChange,
  });
  const remove = useMutation({
    mutationFn: async (m: Member) => { const r = await supabase.from("company_users").delete().eq("id", m.id); if (r.error) throw r.error; },
    onSuccess: onChange,
  });

  return (
    <div className="glass space-y-4 p-6">
      <h3 className="flex items-center gap-2 font-semibold text-white"><Users className="h-4 w-4" /> Personnes de la société ({members.length})</h3>
      <ul className="divide-y divide-white/5">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="text-sm text-white">{m.full_name}</p>
              <p className="text-xs text-white/50">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle.mutate(m)} className={`rounded-full px-2 py-0.5 text-[11px] ${m.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                {m.is_active ? "Accès actif" : "Accès désactivé"}
              </button>
              {m.profile_id && (
                <button title="Nouveau mot de passe" className="text-white/50 hover:text-white" onClick={async () => {
                  const p = window.prompt("Nouveau mot de passe (8 caractères min.)");
                  if (!p) return;
                  try { await setPwd({ data: { profileId: m.profile_id!, password: p } }); window.alert("Mot de passe modifié."); }
                  catch (e) { window.alert((e as Error).message); }
                }}><KeyRound className="h-4 w-4" /></button>
              )}
              <button title="Retirer" className="text-white/50 hover:text-red-300" onClick={() => window.confirm(`Retirer ${m.full_name} ?`) && remove.mutate(m)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {members.length === 0 && <p className="py-2 text-sm text-white/50">Aucune personne pour l'instant.</p>}
      </ul>
      <div className="grid gap-3 sm:grid-cols-4">
        <input placeholder="Nom complet" className={input} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        <input placeholder="Email" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input placeholder="Téléphone" className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input placeholder="Mot de passe" type="text" className={input} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </div>
      {add.error && <p className="text-sm text-red-300">{(add.error as Error).message}</p>}
      <button disabled={add.isPending} onClick={() => add.mutate()} className={`${btn} btn-gradient`}>
        <Plus className="h-4 w-4" /> {add.isPending ? "Ajout…" : "Ajouter la personne"}
      </button>
    </div>
  );
}
