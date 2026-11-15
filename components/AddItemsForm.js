"use client";

import { useActionState, useRef, useEffect } from "react";
import { addItem } from "@/app/admin/menu/items/actions";

export default function AddItemForm({ categories, currency }) {
  const [state, formAction, pending] = useActionState(addItem, { error: null });
  const formRef = useRef(null);
  const wasPending = useRef(false);

  // Clear the form after a successful add
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state]);

  const input = "w-full rounded-lg border border-gray-300 p-3 text-gray-900";

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-xl bg-indigo-50 p-4">
      <p className="font-semibold text-indigo-700">Add an item</p>
      <input name="name" required maxLength={80} placeholder="Item name, e.g. Masala Chai" className={input} />
      <input name="description" maxLength={300} placeholder="Description (optional)" className={input} />
      <div className="flex gap-2">
        <input
          name="price"
          required
          inputMode="decimal"
          placeholder={`Price in ${currency}, e.g. 40`}
          className={input}
        />
        <select name="category_id" className={input} defaultValue="">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add item"}
      </button>
    </form>
  );
}