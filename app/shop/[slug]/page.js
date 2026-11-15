import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export default async function ShopPage({ params }) {
  await connection();
  const { slug } = await params;

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, address, phone")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!business) notFound();

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-3 rounded-2xl bg-white p-6 text-center shadow-md">
        <h1 className="text-3xl font-bold text-indigo-600">{business.name}</h1>
        {business.address && <p className="text-gray-600">{business.address}</p>}
        {business.phone && <p className="text-gray-600">{business.phone}</p>}
        <p className="pt-2 text-sm text-gray-400">Menu coming soon</p>
      </div>
    </main>
  );
}