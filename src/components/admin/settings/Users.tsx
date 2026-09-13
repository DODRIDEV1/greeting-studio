/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { EntityCrud, BoolChip, type ColDef } from "./EntityCrud";
import { LinksModal, serviceGroups } from "./LinksModal";
import { Panel, DataTable, Td } from "@/components/admin/finance/ui";
import { nameOf, type Row, type SaasDataset } from "@/lib/saas-data";

export function UsersTab({ data, canEdit }: { data: SaasDataset; canEdit: boolean }) {
  const [target, setTarget] = useState<Row | null>(null);

  const cols: ColDef[] = [
    {
      label: "Utilisateur",
      render: (r) => <span className="text-white">{r["full_name"]}</span>,
    },
    { label: "Société", render: (r) => nameOf(data.companies, r["company_id"]) },
    { label: "Rôle", render: (r) => nameOf(data.roles, r["role_id"]) },
    { label: "Email", render: (r) => r["email"] ?? "—" },
    { label: "Téléphone", render: (r) => r["phone"] ?? "—" },
    {
      label: "Services autorisés",
      render: (r) =>
        data.userServicePermissions.filter((p) => p["company_user_id"] === r["id"]).length,
    },
    { label: "Statut", render: (r) => <BoolChip value={!!r["is_active"]} /> },
  ];

  return (
    <>
      <EntityCrud
        table="company_users"
        title="Utilisateurs"
        singular="Utilisateur"
        description="Utilisateurs rattachés à une société, avec leur rôle et leurs services autorisés."
        rows={data.companyUsers}
        columns={cols}
        canEdit={canEdit}
        searchKeys={["full_name", "email", "phone"]}
        extraActions={(r) =>
          canEdit ? (
            <button
              onClick={() => setTarget(r)}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              title="Services autorisés"
              aria-label="Services autorisés"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
        fields={[
          { name: "full_name", label: "Nom complet", required: true },
          {
            name: "company_id",
            label: "Société",
            type: "select",
            options: data.companies.map((c) => ({
              value: c["id"] as string,
              label: c["name"] as string,
            })),
          },
          {
            name: "role_id",
            label: "Rôle",
            type: "select",
            options: data.roles.map((r) => ({
              value: r["id"] as string,
              label: r["name"] as string,
            })),
          },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Téléphone" },
          { name: "is_active", label: "Actif", type: "bool", fallback: true },
        ]}
      />
      {target && (
        <LinksModal
          title={`Services autorisés — ${target["full_name"]}`}
          groups={serviceGroups(data.apps, data.services)}
          selected={data.userServicePermissions
            .filter((p) => p["company_user_id"] === target["id"])
            .map((p) => p["service_id"] as string)}
          table="user_service_permissions"
          ownerKey="company_user_id"
          ownerId={target["id"] as string}
          targetKey="service_id"
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}

export function RolesTab({ data, canEdit }: { data: SaasDataset; canEdit: boolean }) {
  const [target, setTarget] = useState<Row | null>(null);

  const cols: ColDef[] = [
    { label: "Code", render: (r) => <span className="font-mono text-xs">{r["code"]}</span> },
    { label: "Rôle", render: (r) => <span className="text-white">{r["name"]}</span> },
    { label: "Description", render: (r) => r["description"] ?? "—" },
    {
      label: "Permissions",
      render: (r) => data.rolePermissions.filter((p) => p["role_id"] === r["id"]).length,
    },
    {
      label: "Utilisateurs",
      render: (r) => data.companyUsers.filter((u) => u["role_id"] === r["id"]).length,
    },
    {
      label: "Système",
      render: (r) => (r["is_system"] ? "Oui" : "Non"),
    },
  ];

  return (
    <>
      <EntityCrud
        table="saas_roles"
        title="Rôles"
        singular="Rôle"
        description="Profils d'accès réutilisables. Les permissions d'un rôle s'appliquent à ses utilisateurs."
        rows={data.roles}
        columns={cols}
        canEdit={canEdit}
        searchKeys={["name", "code"]}
        extraActions={(r) =>
          canEdit ? (
            <button
              onClick={() => setTarget(r)}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              title="Permissions du rôle"
              aria-label="Permissions du rôle"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
        fields={[
          { name: "code", label: "Code", required: true },
          { name: "name", label: "Nom", required: true },
          { name: "sort_order", label: "Ordre", type: "number", fallback: 0 },
          { name: "is_system", label: "Rôle système", type: "bool", fallback: false },
          { name: "description", label: "Description", type: "textarea" },
        ]}
      />
      {target && (
        <LinksModal
          title={`Permissions — ${target["name"]}`}
          groups={serviceGroups(data.apps, data.services)}
          selected={data.rolePermissions
            .filter((p) => p["role_id"] === target["id"])
            .map((p) => p["service_id"] as string)}
          table="role_permissions"
          ownerKey="role_id"
          ownerId={target["id"] as string}
          targetKey="service_id"
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}

/** Matrice de synthèse rôles × services (lecture seule). */
export function PermissionsTab({ data }: { data: SaasDataset }) {
  const [appId, setAppId] = useState<string>(
    (data.apps[0]?.["id"] as string | undefined) ?? "",
  );
  const services = data.services.filter((s) => s["app_id"] === appId);
  const allowed = new Set(
    data.rolePermissions.map((p) => `${p["role_id"]}:${p["service_id"]}`),
  );

  return (
    <Panel
      title="Permissions"
      actions={
        <select
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-white"
        >
          {data.apps.map((a) => (
            <option key={a["id"] as string} value={a["id"] as string} className="bg-[#0b0c12]">
              {a["name"] as string}
            </option>
          ))}
        </select>
      }
    >
      <p className="mb-4 text-xs text-white/50">
        Synthèse des services accessibles par rôle. Modifiez les permissions depuis l'onglet Rôles.
      </p>
      <DataTable
        head={["Service", ...data.roles.map((r) => r["name"] as string)]}
        empty={services.length === 0}
      >
        {services.map((s) => (
          <tr key={s["id"] as string} className="hover:bg-white/[0.02]">
            <Td>
              <span className={s["parent_id"] ? "pl-5 text-white/70" : "text-white"}>
                {s["parent_id"] ? "— " : ""}
                {s["name"]}
              </span>
            </Td>
            {data.roles.map((r) => (
              <Td key={r["id"] as string}>
                {allowed.has(`${r["id"]}:${s["id"]}`) ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Oui
                  </span>
                ) : (
                  <span className="text-white/25">—</span>
                )}
              </Td>
            ))}
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
