import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Log in first" }, { status: 401 });

  // Businesses that belong to someone else
  const { data: others } = await supabase
    .from("businesses")
    .select("id, name")
    .neq("admin_id", user.id);

  const attacks = [];
  for (const b of others ?? []) {
    const upd = await supabase
      .from("businesses")
      .update({ name: "HACKED" })
      .eq("id", b.id)
      .select();
    const tax = await supabase
      .from("business_tax_settings")
      .update({ tax_registration_no: "HACKED" })
      .eq("business_id", b.id)
      .select();
    const del = await supabase
      .from("businesses")
      .delete()
      .eq("id", b.id)
      .select();

    attacks.push({
      target: b.name,
      businessRowsChanged: upd.data?.length ?? 0,
      taxRowsChanged: tax.data?.length ?? 0,
      businessRowsDeleted: del.data?.length ?? 0,
    });
  }

  return Response.json({ loggedInAs: user.email, attacks });
}