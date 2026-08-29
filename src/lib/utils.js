import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatBDTPrice(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "৳0";
  return `৳${Math.round(numeric).toLocaleString("en-BD")}`;
}

export function getPriceDisplay(item, fallbackPrice = 0) {
  const original =
    Number(
      item?.basePrice ??
        item?.originalPrice ??
        item?.price ??
        fallbackPrice ??
        0,
    ) || 0;

  const final =
    Number(
      item?.effectivePrice ??
        item?.price ??
        item?.basePrice ??
        fallbackPrice ??
        0,
    ) || 0;

  const discountPercentage = Number(item?.discountPercentage ?? 0) || 0;
  const hasDiscount =
    discountPercentage > 0 && original > 0 && final > 0 && original > final;

  return {
    original: hasDiscount ? original : final,
    final,
    discountPercentage: hasDiscount ? Math.round(discountPercentage) : 0,
    hasDiscount,
  };
}
