"use client";

import { useActionState, useState } from "react";
import { createBusiness } from "@/app/admin/business/new/actions";

const COUNTRY_NAMES = {
  IN: "India",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
};

export default function BusinessForm({ rules }) {
  const [state, formAction, pending] = useActionState(createBusiness, {
    error: null,
  });
  const [country, setCountry] = useState(rules[0]?.country_code ?? "");

  const rule = rules.find((r) => r.country_code === country);
  const totalRate = rule
    ? rule.components.reduce((sum, c) => sum + c.rate, 0)
    : 0;

  const inputClass =
    "w-full rounded-lg border border-gray-300 p-3 text-gray-900";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Cafe / business name
        </label>
        <input name="name" required className={inputClass} placeholder="e.g. Chai Point" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Country
        </label>
        <select
          name="country_code"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputClass}
        >
          {rules.map((r) => (
            <option key={r.id} value={r.country_code}>
              {COUNTRY_NAMES[r.country_code] ?? r.country_code}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          State / region (optional)
        </label>
        <input name="region" className={inputClass} placeholder="e.g. Punjab" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address
        </label>
        <input name="address" className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input name="phone" className={inputClass} />
      </div>

      {rule && (
        <div
          key={country}
          className="space-y-3 rounded-xl bg-indigo-50 p-4"
        >
          <p className="font-semibold text-indigo-700">
            Tax details for {COUNTRY_NAMES[country] ?? country}
          </p>
          <p className="text-sm text-gray-700">
            {rule.tax_name} {totalRate}% (
            {rule.components.map((c) => `${c.name} ${c.rate}%`).join(" + ")})
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {rule.tax_name} registration number (optional)
            </label>
            <input name="tax_registration_no" className={inputClass} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="prices_include_tax"
              defaultChecked={rule.prices_include_tax}
            />
            My menu prices already include tax
          </label>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create business"}
      </button>
    </form>
  );
}