"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

// "120.50" → 12050 paise. Returns null if invalid.
function parsePrice(raw) {
  const n = Number(String(raw ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 1000000) return null;
  return Math.round(n * 100);
}

// Makes sure the category belongs to this business
async function checkCategory(ctx, categoryId) {
  if (!categoryId) return { ok: true, id: null };
  const { data } = await ctx.supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("business_id", ctx.business.id)
    .maybeSingle();
  return data ? { ok: true, id: data.id } : { ok: false };
}

export async function addItem(prevState, formData) {
  const ctx = await getContext();
  if (ctx.error) return { error: ctx.error };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = parsePrice(formData.get("price"));
  const cat = await checkCategory(ctx, String(formData.get("category_id") ?? ""));

  if (!name || name.length > 80) return { error: "Enter an item name (max 80 characters)." };
  if (description && description.length > 300) return { error: "Description is too long (max 300)." };
  if (price === null) return { error: "Enter a valid price, for example 120 or 99.50." };
  if (!cat.ok) return { error: "Invalid category." };

  let q = ctx.supabase
    .from("menu_items")
    .select("sort_order")
    .eq("business_id", ctx.business.id);
  q = cat.id ? q.eq("category_id", cat.id) : q.is("category_id", null);
  const { data: last } = await q
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await ctx.supabase.from("menu_items").insert({
    business_id: ctx.business.id,
    category_id: cat.id,
    name,
    description,
    price_paise: price,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/menu/items");
  return { error: null };
}

export async function updateItem(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = parsePrice(formData.get("price"));
  const cat = await checkCategory(ctx, String(formData.get("category_id") ?? ""));

  if (!id || !name || name.length > 80 || price === null || !cat.ok) return;
  if (description && description.length > 300) return;

  await ctx.supabase
    .from("menu_items")
    .update({
      name,
      description,
      price_paise: price,
      category_id: cat.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", ctx.business.id);

  revalidatePath("/admin/menu/items");
}

export async function toggleAvailability(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  const makeAvailable = String(formData.get("available") ?? "") === "true";
  if (!id) return;

  await ctx.supabase
    .from("menu_items")
    .update({ is_available: makeAvailable, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", ctx.business.id);

  revalidatePath("/admin/menu/items");
}

export async function deleteItem(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await ctx.supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("business_id", ctx.business.id);

  revalidatePath("/admin/menu/items");
}

export async function moveItem(formData) {
  const ctx = await getContext();
  if (ctx.error) return;

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const { data: me } = await ctx.supabase
    .from("menu_items")
    .select("id, category_id")
    .eq("id", id)
    .eq("business_id", ctx.business.id)
    .maybeSingle();
  if (!me) return;

  // Only reorder among items in the same category
  let q = ctx.supabase
    .from("menu_items")
    .select("id")
    .eq("business_id", ctx.business.id);
  q = me.category_id ? q.eq("category_id", me.category_id) : q.is("category_id", null);
  const { data: items } = await q
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!items) return;

  const i = items.findIndex((x) => x.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= items.length) return;

  [items[i], items[j]] = [items[j], items[i]];

  for (let k = 0; k < items.length; k++) {
    await ctx.supabase
      .from("menu_items")
      .update({ sort_order: k })
      .eq("id", items[k].id)
      .eq("business_id", ctx.business.id);
  }

  revalidatePath("/admin/menu/items");
}