"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Finds the logged-in admin and their business. Never trusts the browser.
async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("admin_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Create your business first." };

  return { supabase, business };
}

export async function addCategory(prevState, formData) {
  const ctx = await getContext();
  if (ctx.error) return { error: ctx.error };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a category name." };
  if (name.length > 60) return { error: "Name is too long (max 60 characters)." };

  const { data: last } = await ctx.supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("business_id", ctx.business.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await ctx.supabase.from("menu_categories").insert({
    business_id: ctx.business.id,
    name,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { error: null };
}

export async function renameCategory(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name || name.length > 60) return;

  await ctx.supabase
    .from("menu_categories")
    .update({ name })
    .eq("id", id)
    .eq("business_id", ctx.business.id);

  revalidatePath("/admin/menu");
}

export async function deleteCategory(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await ctx.supabase
    .from("menu_categories")
    .delete()
    .eq("id", id)
    .eq("business_id", ctx.business.id);

  revalidatePath("/admin/menu");
}

export async function moveCategory(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const { data: cats } = await ctx.supabase
    .from("menu_categories")
    .select("id")
    .eq("business_id", ctx.business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!cats) return;

  const i = cats.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= cats.length) return;

  [cats[i], cats[j]] = [cats[j], cats[i]];

  // Re-number everything 0..n so the order is always clean
  for (let k = 0; k < cats.length; k++) {
    await ctx.supabase
      .from("menu_categories")
      .update({ sort_order: k })
      .eq("id", cats[k].id)
      .eq("business_id", ctx.business.id);
  }

  revalidatePath("/admin/menu");
}