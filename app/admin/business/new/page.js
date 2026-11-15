import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import BusinessForm from "@/components/BusinessForm";

export default async function NewBusinessPage() {
    await connection();
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/admin/login");

    // If this admin already has a business, go back to the dashboard
    const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("admin_id", user.id)
        .maybeSingle();
    if (existing) redirect("/admin");

    const { data: rules } = await supabase
        .from("tax_rules")
        .select("*")
        .is("region_code", null)
        .order("country_code");

    return (
        <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-md">
                <h1 className="text-2xl font-bold text-indigo-600">Set up your business</h1>
                <p className="mb-6 mt-1 text-gray-600">
                    Tell us about your cafe. Tax details are filled in automatically from
                    your country.
                </p>
                <BusinessForm rules={rules ?? []} />
            </div>
        </main>
    );
}