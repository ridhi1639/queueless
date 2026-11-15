"use client";

import { useActionState } from "react";
import { addCategory } from "@/app/admin/menu/actions";

export default function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategory, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={60}
          placeholder="New category, e.g. Hot Drinks"
          className="flex-1 rounded-lg border border-gray-300 p-3 text-gray-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}