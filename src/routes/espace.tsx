import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  AppWindow,
  Building2,
  CalendarClock,
  FileText,
  Layers,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useClientWorkspace } from "@/lib/client-portal";

export const Route = createFileRoute("/espace")({
  component: EspacePage,
  head: () => ({
    meta: [
      { title: "Espace client SaaS — DODRICOM" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Espace client DODRICOM : accédez aux applications et services inclus dans votre abonnement SaaS.",
      },
      { property: "og:title", content: "Espace client SaaS — DODRICOM" },
      {
        property: "og:description",
        content:
          "Accédez aux applications, services et factures liés à votre abonnement DODRICOM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function fmtDate(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

function EspacePage() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useClientWorkspace(user?.id);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  // Le personnel interne va au back-office.
  useEffect(() => {
    if (user && user.roles.length > 0) navigate({ to: "/admin", replace: true });
  }, [user, navigate]);

  if (!ready || isLoading) {
    return <Center>Chargement de votre espace…</Center>;
  }

  if (error) {
    return <Center>Impossible de charger votre espace pour le moment.</Center>;
  }

  if (!data?.membership) {
    return (
      <Center>
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold text-white">Aucun accès SaaS trouvé</p>
          <p className="text-sm text-white/60">
            Votre compte n'est rattaché à aucune société cliente. Contactez DODRICOM
            pour activer votre accès.
          </p>
          <Link to="/contact" className="btn-gradient inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">
            Nous contacter
          </Link>
        </div>
      </Center>
    );
  }

  const active = data.activeSubscriptions;
  const suspended = active.length === 0;

  return (
    <main className="min-h-screen bg-[#07060d] px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Espace client
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white">
              {String(data.company?.["name"] ?? "Votre société")}
            </h1>
            <p className="mt-1 text-sm text-white/55">
              {user?.email}
              {data.role ? ` · ${String(data.role["name"])}` : ""}
            </p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate({ to: "/", replace: true });
            }}
            className="btn-ghost-glow inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </header>

        {suspended && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Aucun abonnement actif. L'accès aux applications est suspendu jusqu'au
            renouvellement.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Layers className="h-4 w-4" />} label="Abonnements actifs" value={active.length} />
          <Stat icon={<AppWindow className="h-4 w-4" />} label="Applications" value={suspended ? 0 : data.apps.length} />
          <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Services autorisés" value={suspended ? 0 : data.services.length} />
        </section>

        <Block title="Mes applications" icon={<AppWindow className="h-4 w-4" />}>
          {suspended || data.apps.length === 0 ? (
            <Empty>Aucune application disponible avec votre abonnement.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.apps.map((a) => (
                <div key={String(a["id"])} className="glass rounded-2xl border border-white/10 p-4">
                  <p className="font-semibold text-white">{String(a["name"])}</p>
                  <p className="mt-1 text-xs text-white/55">{String(a["description"] ?? "")}</p>
                </div>
              ))}
            </div>
          )}
        </Block>

        <Block title="Mes services" icon={<ShieldCheck className="h-4 w-4" />}>
          {suspended || data.services.length === 0 ? (
            <Empty>Aucun service autorisé par votre plan ou votre rôle.</Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.services.map((s) => (
                <span
                  key={String(s["id"])}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/80"
                >
                  {String(s["name"])}
                </span>
              ))}
            </div>
          )}
        </Block>

        <Block title="Mes abonnements" icon={<CalendarClock className="h-4 w-4" />}>
          {data.subscriptions.length === 0 ? (
            <Empty>Aucun abonnement enregistré.</Empty>
          ) : (
            <Table
              head={["Plan", "Application", "Statut", "Début", "Fin"]}
              rows={data.subscriptions.map((s) => [
                String((s["plan"] as Record<string, unknown> | null)?.["name"] ?? "—"),
                String((s["app"] as Record<string, unknown> | null)?.["name"] ?? "—"),
                String(s["status"] ?? "—"),
                fmtDate(s["start_date"]),
                fmtDate(s["end_date"]),
              ])}
            />
          )}
        </Block>

        <Block title="Mes factures" icon={<FileText className="h-4 w-4" />}>
          {data.invoices.length === 0 ? (
            <Empty>Aucune facture pour le moment.</Empty>
          ) : (
            <Table
              head={["Numéro", "Date", "Montant", "Statut"]}
              rows={data.invoices.map((i) => [
                String(i["number"] ?? i["id"]),
                fmtDate(i["issue_date"]),
                `${Number(i["total"] ?? i["amount"] ?? 0).toLocaleString("fr-FR")} DH`,
                String(i["status"] ?? "—"),
              ])}
            />
          )}
        </Block>

        <p className="flex items-center gap-2 text-xs text-white/40">
          <Building2 className="h-3.5 w-3.5" /> DODRICOM · Espace réservé aux clients
        </p>
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07060d] px-6 text-center text-white/70">
      {children}
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/45">
        {icon} {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Block({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-white/60">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
      {children}
    </p>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.12em] text-white/45">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/5 text-white/80">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
