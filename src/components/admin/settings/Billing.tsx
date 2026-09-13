/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityCrud, StatusChip, type ColDef } from "./EntityCrud";
import { DataTable, Panel, Td, fmt } from "@/components/admin/finance/ui";
import { nameOf, type Row, type SaasDataset } from "@/lib/saas-data";

const INVOICE_STATUS = [
  { value: "unpaid", label: "Impayée" },
  { value: "sent", label: "Envoyée" },
  { value: "paid", label: "Payée" },
  { value: "overdue", label: "En retard" },
  { value: "cancelled", label: "Annulée" },
];

function invoiceLabel(data: SaasDataset, id: string | null | undefined) {
  const inv = data.invoices.find((i) => i["id"] === id);
  if (!inv) return "—";
  return `${inv["number"]} — ${nameOf(data.clients, inv["client_id"], "full_name")}`;
}

export function InvoicesTab({ data, canEdit }: { data: SaasDataset; canEdit: boolean }) {
  const cols: ColDef[] = [
    { label: "Numéro", render: (r) => <span className="text-white">{r["number"]}</span> },
    { label: "Client", render: (r) => nameOf(data.clients, r["client_id"], "full_name") },
    { label: "Émission", render: (r) => r["issue_date"] },
    { label: "Échéance", render: (r) => r["due_date"] ?? "—" },
    { label: "HT", render: (r) => fmt(Number(r["amount_ht"] ?? 0), r["currency"] as string) },
    { label: "TVA", render: (r) => `${Number(r["vat_rate"] ?? 0)} %` },
    { label: "TTC", render: (r) => fmt(Number(r["amount_ttc"] ?? 0), r["currency"] as string) },
    {
      label: "Réglé",
      render: (r) =>
        fmt(
          data.payments
            .filter((p) => p["invoice_id"] === r["id"])
            .reduce((s, p) => s + Number(p["amount"] ?? 0), 0),
          r["currency"] as string,
        ),
    },
    { label: "Statut", render: (r) => <StatusChip value={r["status"]} /> },
  ];

  return (
    <EntityCrud
      table="subscription_invoices"
      title="Facturation"
      singular="Facture"
      description="Factures d'abonnement émises aux clients."
      rows={data.invoices}
      columns={cols}
      canEdit={canEdit}
      searchKeys={["number", "status", "notes"]}
      fields={[
        { name: "number", label: "Numéro", required: true },
        {
          name: "client_id",
          label: "Client",
          type: "select",
          options: data.clients.map((c) => ({
            value: c["id"] as string,
            label: c["full_name"] as string,
          })),
        },
        {
          name: "subscription_id",
          label: "Abonnement",
          type: "select",
          options: data.subscriptions.map((s) => ({
            value: s["id"] as string,
            label: `${nameOf(data.clients, s["client_id"], "full_name")} — ${nameOf(
              data.plans,
              s["plan_id"],
            )}`,
          })),
        },
        { name: "issue_date", label: "Date d'émission", type: "date", required: true },
        { name: "due_date", label: "Échéance", type: "date" },
        { name: "amount_ht", label: "Montant HT", type: "number", fallback: 0 },
        { name: "vat_rate", label: "TVA (%)", type: "number", fallback: 20 },
        { name: "amount_ttc", label: "Montant TTC", type: "number", fallback: 0 },
        { name: "currency", label: "Devise", fallback: "MAD" },
        {
          name: "status",
          label: "Statut",
          type: "select",
          options: INVOICE_STATUS,
          fallback: "unpaid",
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}

export function PaymentsTab({ data, canEdit }: { data: SaasDataset; canEdit: boolean }) {
  const cols: ColDef[] = [
    { label: "Date", render: (r) => r["paid_at"] },
    { label: "Facture", render: (r) => invoiceLabel(data, r["invoice_id"]) },
    { label: "Montant", render: (r) => fmt(Number(r["amount"] ?? 0)) },
    { label: "Mode", render: (r) => r["method"] },
    { label: "Référence", render: (r) => r["reference"] ?? "—" },
    { label: "Note", render: (r) => r["note"] ?? "—" },
  ];

  return (
    <EntityCrud
      table="subscription_payments"
      title="Paiements"
      singular="Paiement"
      description="Règlements reçus sur les factures d'abonnement."
      rows={data.payments}
      columns={cols}
      canEdit={canEdit}
      searchKeys={["reference", "method", "note"]}
      fields={[
        {
          name: "invoice_id",
          label: "Facture",
          type: "select",
          required: true,
          options: data.invoices.map((i) => ({
            value: i["id"] as string,
            label: `${i["number"]} — ${nameOf(data.clients, i["client_id"], "full_name")}`,
          })),
        },
        { name: "paid_at", label: "Date", type: "date", required: true },
        { name: "amount", label: "Montant", type: "number", fallback: 0 },
        {
          name: "method",
          label: "Mode de règlement",
          type: "select",
          fallback: "virement",
          options: [
            { value: "virement", label: "Virement" },
            { value: "cheque", label: "Chèque" },
            { value: "especes", label: "Espèces" },
            { value: "carte", label: "Carte bancaire" },
            { value: "prelevement", label: "Prélèvement" },
          ],
        },
        { name: "reference", label: "Référence" },
        { name: "note", label: "Note", type: "textarea" },
      ]}
    />
  );
}

export function AuditTab({ data }: { data: SaasDataset }) {
  const rows: Row[] = data.audit;
  return (
    <Panel title="Journal d'activité">
      <p className="mb-4 text-xs text-white/50">
        200 dernières actions enregistrées sur la plateforme.
      </p>
      <DataTable
        head={["Date", "Utilisateur", "Action", "Type", "Élément"]}
        empty={rows.length === 0}
      >
        {rows.map((r) => (
          <tr key={r["id"] as string} className="hover:bg-white/[0.02]">
            <Td>{new Date(r["created_at"] as string).toLocaleString("fr-FR")}</Td>
            <Td>{r["actor_name"] ?? "—"}</Td>
            <Td>
              <span className="text-white">{r["action"]}</span>
            </Td>
            <Td>{r["entity_type"] ?? "—"}</Td>
            <Td>
              <span className="font-mono text-[11px] text-white/50">{r["entity_id"] ?? "—"}</span>
            </Td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
