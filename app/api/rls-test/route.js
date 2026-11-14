import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select("*");
  return Response.json({ rows: data, error: error?.message ?? null });
}