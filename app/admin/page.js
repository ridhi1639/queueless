import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ShopQr from "@/components/ShopQr";

export default async function AdminHomePage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, country_code, address")
    .eq("admin_id", user.id)
    .maybeSingle();

  let tax = null;
  if (business) {
    const { data } = await supabase
      .from("business_tax_settings")
      .select("tax_name, components, prices_include_tax, tax_registration_no")
      .eq("business_id", business.id)
      .maybeSingle();
    tax = data;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">Logged in as {user.email}</p>
          </div>
          <LogoutButton />
        </div>

        {business ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-gray-800">
              <p className="text-lg font-semibold">{business.name}</p>
              <p className="text-sm text-gray-600">Country: {business.country_code}</p>
              {business.address && (
                <p className="text-sm text-gray-600">Address: {business.address}</p>
              )}
              {tax && (
                <p className="text-sm text-gray-600">
                  Tax: {tax.tax_name} (
                  {tax.components.map((c) => `${c.name} ${c.rate}%`).join(" + ")}),{" "}
                  {tax.prices_include_tax ? "prices include tax" : "tax added on top"}
                </p>
              )}
              <div className="pt-2">
                <ShopQr
                  url={`${siteUrl}/shop/${business.slug}`}
                  businessName={business.name}
                />
              </div>
            </div>

            <Link
              href="/admin/menu"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white"
            >
              Manage menu
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-indigo-50 p-4">
            <p className="text-gray-700">You haven't set up your business yet.</p>
            <Link
              href="/admin/business/new"
              className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white"
            >
              Create business
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}