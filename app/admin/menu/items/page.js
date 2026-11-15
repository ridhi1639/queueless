import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import AddItemForm from "@/components/AddItemForm";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { currencyFor } from "@/lib/money";
import { updateItem, toggleAvailability, deleteItem, moveItem } from "./actions";

export default async function ItemsPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, country_code")
    .eq("admin_id", user.id)
    .maybeSingle();
  if (!business) redirect("/admin/business/new");

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name, description, price_paise, category_id, is_available")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const currency = currencyFor(business.country_code);
  const cats = categories ?? [];
  const all = items ?? [];

  const groups = [
    ...cats.map((c) => ({ id: c.id, name: c.name, items: all.filter((x) => x.category_id === c.id) })),
    { id: null, name: "No category", items: all.filter((x) => !x.category_id) },
  ].filter((g) => g.items.length > 0);

  const small = "rounded border border-gray-300 px-2 py-1 text-sm text-gray-700";
  const input = "w-full rounded-lg border border-gray-300 p-2 text-gray-900";

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-md">
        <div>
          <Link href="/admin/menu" className="text-sm text-indigo-600">← Back to categories</Link>
          <h1 className="mt-2 text-2xl font-bold text-indigo-600">Items · {business.name}</h1>
          <p className="text-gray-600">Step 2: add your dishes and prices.</p>
        </div>

        <AddItemForm categories={cats} currency={currency} />

        {groups.length === 0 && (
          <p className="text-sm text-gray-500">No items yet. Add your first one above.</p>
        )}

        {groups.map((g) => (
          <section key={g.id ?? "none"} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">{g.name}</h2>

            {g.items.map((it, i, arr) => (
              <div
                key={it.id}
                className={`space-y-2 rounded-xl border p-3 ${
                  it.is_available ? "border-gray-200" : "border-gray-200 bg-gray-50 opacity-70"
                }`}
              >
                <form action={updateItem} className="space-y-2">
                  <input type="hidden" name="id" value={it.id} />
                  <div className="flex gap-2">
                    <input name="name" defaultValue={it.name} required maxLength={80} className={input} />
                    <input
                      name="price"
                      defaultValue={(it.price_paise / 100).toFixed(2)}
                      required
                      inputMode="decimal"
                      className={`${input} max-w-28`}
                    />
                  </div>
                  <input
                    name="description"
                    defaultValue={it.description ?? ""}
                    maxLength={300}
                    placeholder="Description"
                    className={input}
                  />
                  <div className="flex gap-2">
                    <select name="category_id" defaultValue={it.category_id ?? ""} className={input}>
                      <option value="">No category</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="submit" className={small}>Save</button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={toggleAvailability}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="available" value={it.is_available ? "false" : "true"} />
                    <button
                      type="submit"
                      className={`rounded border px-2 py-1 text-sm ${
                        it.is_available
                          ? "border-green-300 text-green-700"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {it.is_available ? "Available ✓" : "Unavailable"}
                    </button>
                  </form>

                  <form action={moveItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={i === 0} className={`${small} disabled:opacity-30`}>↑</button>
                  </form>
                  <form action={moveItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={i === arr.length - 1} className={`${small} disabled:opacity-30`}>↓</button>
                  </form>

                  <form action={deleteItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <ConfirmSubmitButton
                      message={`Delete "${it.name}"?`}
                      className="rounded border border-red-300 px-2 py-1 text-sm text-red-600"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}