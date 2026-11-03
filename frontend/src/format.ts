// Assumption: prices from the product source are in AUD.
const priceFormat = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

export function formatPrice(price: number): string {
  return priceFormat.format(price);
}
