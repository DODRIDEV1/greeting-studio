import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string };

async function assertAdmin(context: Ctx) {
  const [a, s] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  if (!a.data && !s.data) throw new Error("Accès refusé : réservé aux administrateurs.");
}

/** Crée (ou rattache) un compte de connexion pour une personne d'une société cliente. */
export const createCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; fullName: string; email: string; phone?: string; password: string }) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw new Error("Email invalide.");
    if (d.password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    if (!d.fullName.trim()) throw new Error("Nom requis.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.fullName },
    });
    if (error) throw new Error(error.message.includes("already") ? "Cet email a déjà un compte." : error.message);
    const uid = created.user!.id;

    await supabaseAdmin.from("profiles").upsert({ id: uid, email, display_name: data.fullName }, { onConflict: "id" });
    const { error: e2 } = await supabaseAdmin.from("company_users").insert({
      company_id: data.companyId,
      profile_id: uid,
      full_name: data.fullName.trim(),
      email,
      phone: data.phone || null,
      is_active: true,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true as const };
  });

export const setCompanyMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string; password: string }) => {
    if (d.password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.profileId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
