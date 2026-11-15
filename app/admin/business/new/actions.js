"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

export async function createBusiness(prevState, formData) {
  const supabase = await createClient();

  // Who is logged in? Verified by Supabase, not taken from the form.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const name = String(formData.get("name") ?? "").trim();
  const countryCode = String(formData.get("country_code") ?? "").trim();
  const regionCode = String(formData.get("region") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const taxRegNo = String(formData.get("tax_registration_no") ?? "").trim() || null;
  const pricesIncludeTax = formData.get("prices_include_tax") === "on";

  if (name.length < 2) return { error: "Please enter the cafe name." };
  if (!countryCode) return { error: "Please choose a country." };

  // One business per admin
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("admin_id", user.id)
    .maybeSingle();
  if (existing) redirect("/admin");

  // Reload the tax rule on the server
  const { data: rule } = await supabase
    .from("tax_rules")
    .select("*")
    .eq("country_code", countryCode)
    .is("region_code", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rule) {
    return { error: "Tax rules for this country are not available yet." };
  }

  // Create the business with a unique slug (retry if it ever collides)
  let business = null;
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${slugify(name)}-${suffix}`;

    const { data, error } = await supabase
      .from("businesses")
      .insert({
        admin_id: user.id,
        name,
        slug,
        country_code: countryCode,
        region_code: regionCode,
        address,
        phone,
      })
      .select("id")
      .single();

    if (!error) {
      business = data;
      break;
    }
    if (error.code !== "23505") return { error: error.message };
  }

  if (!business) return { error: "Could not create the business. Please try again." };

  // Save the tax settings (copied from the rule, now owned by this business)
  const { error: taxError } = await supabase.from("business_tax_settings").insert({
    business_id: business.id,
    country_code: countryCode,
    region_code: regionCode,
    tax_name: rule.tax_name,
    tax_registration_no: taxRegNo,
    components: rule.components,
    prices_include_tax: pricesIncludeTax,
  });

  if (taxError) {
    // Undo, so we never keep a business without tax settings
    await supabase.from("businesses").delete().eq("id", business.id);
    return { error: taxError.message };
  }

  redirect("/admin");
}