import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import AddCategoryForm from "@/components/AddCategoryForm";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { renameCategory, deleteCategory, moveCategory } from "./actions";

export default async function MenuPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("admin_id", user.id)
    .maybeSingle();
  if (!business) redirect("/admin/business/new");

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const small =
    "rounded border border-gray-300 px-2 py-1 text-sm text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-md">
        <div>
          <Link href="/admin" className="text-sm text-indigo-600">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-indigo-600">
            Menu · {business.name}
          </h1>
          <p className="text-gray-600">Step 1: organise your categories.</p>
          <Link
            href="/admin/menu/items"
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Manage items →
          </Link>
        </div>

        <AddCategoryForm />

        <div className="space-y-3">
          {(categories ?? []).length === 0 && (
            <p className="text-sm text-gray-500">
              No categories yet. Add your first one above.
            </p>
          )}

          {(categories ?? []).map((c, i, arr) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 p-3"
            >
              <form action={renameCategory} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="name"
                  defaultValue={c.name}
                  required
                  maxLength={60}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 p-2 text-gray-900"
                />
                <button type="submit" className={small}>
                  Save
                </button>
              </form>

              <form action={moveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={i === 0}
                  className={`${small} disabled:opacity-30`}
                >
                  ↑
                </button>
              </form>
              <form action={moveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={i === arr.length - 1}
                  className={`${small} disabled:opacity-30`}
                >
                  ↓
                </button>
              </form>

              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmSubmitButton
                  message={`Delete "${c.name}"? Its items will stay but become uncategorised.`}
                  className="rounded border border-red-300 px-2 py-1 text-sm text-red-600"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}