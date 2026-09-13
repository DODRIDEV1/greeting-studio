import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth";
import { btnCls } from "@/components/admin/finance/ui";
import { SAAS_QUERY_KEY, useSaasData } from "@/lib/saas-data";
import { AppsTab, ServicesTab, PlansTab } from "@/components/admin/settings/Catalog";
import {
  ClientsTab,
  CompaniesTab,
  SubscriptionsTab,
} from "@/components/admin/settings/Clients";
import { UsersTab, RolesTab, PermissionsTab } from "@/components/admin/settings/Users";
import { InvoicesTab, PaymentsTab, AuditTab } from "@/components/admin/settings/Billing";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type TabKey =
  | "apps"
  | "services"
  | "plans"
  | "companies"
  | "clients"
  | "subscriptions"
  | "users"
  | "roles"
  | "permissions"
  | "invoices"
  | "payments"
  | "audit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "apps", label: "Applications" },
  { key: "services", label: "Services" },
  { key: "plans", label: "Plans" },
  { key: "companies", label: "Sociétés" },
  { key: "clients", label: "Clients" },
  { key: "subscriptions", label: "Abonnements" },
  { key: "users", label: "Utilisateurs" },
  { key: "roles", label: "Rôles" },
  { key: "permissions", label: "Permissions" },
  { key: "invoices", label: "Facturation" },
  { key: "payments", label: "Paiements" },
  { key: "audit", label: "Audit" },
];

function SettingsPage() {
  const { user, can } = useAuth();
  const { data, isLoading, error } = useSaasData();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("apps");

  const allowed = can("settings");
  const canEdit =
    allowed && !!user?.roles.some((r) => r === "admin" || r === "super_admin");

  return (
    <AdminShell title="Paramètres" breadcrumbs={[{ label: "Paramètres" }]}>
      {!allowed ? (
        <div className="glass p-8 text-sm text-white/60">
          Vous n'avez pas accès au centre d'administration.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  tab === t.key
                    ? "bg-[var(--gradient-brand)] text-white shadow-[0_0_20px_rgba(139,61,255,0.35)]"
                    : "border border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              className={`${btnCls} ml-auto`}
              onClick={() => qc.invalidateQueries({ queryKey: SAAS_QUERY_KEY })}
            >
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>

          {isLoading && (
            <div className="glass flex items-center gap-3 p-8 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des données…
            </div>
          )}
          {error && (
            <div className="glass p-6 text-sm text-rose-300">
              Impossible de charger les données d'administration.
            </div>
          )}

          {data && (
            <>
              {tab === "apps" && <AppsTab data={data} canEdit={canEdit} />}
              {tab === "services" && <ServicesTab data={data} canEdit={canEdit} />}
              {tab === "plans" && <PlansTab data={data} canEdit={canEdit} />}
              {tab === "companies" && <CompaniesTab data={data} canEdit={canEdit} />}
              {tab === "clients" && <ClientsTab data={data} canEdit={canEdit} />}
              {tab === "subscriptions" && <SubscriptionsTab data={data} canEdit={canEdit} />}
              {tab === "users" && <UsersTab data={data} canEdit={canEdit} />}
              {tab === "roles" && <RolesTab data={data} canEdit={canEdit} />}
              {tab === "permissions" && <PermissionsTab data={data} />}
              {tab === "invoices" && <InvoicesTab data={data} canEdit={canEdit} />}
              {tab === "payments" && <PaymentsTab data={data} canEdit={canEdit} />}
              {tab === "audit" && <AuditTab data={data} />}
            </>
          )}
        </div>
      )}
    </AdminShell>
  );
}
