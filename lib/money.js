const CURRENCY = { IN: "INR", AE: "AED", GB: "GBP" };
const LOCALE = { IN: "en-IN", AE: "en-AE", GB: "en-GB" };

export function currencyFor(countryCode) {
  return CURRENCY[countryCode] ?? "INR";
}

// paise (integer) → "₹120.50"
export function formatMoney(paise, countryCode) {
  return new Intl.NumberFormat(LOCALE[countryCode] ?? "en-IN", {
    style: "currency",
    currency: currencyFor(countryCode),
  }).format(paise / 100);
}