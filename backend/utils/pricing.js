function normalizeDiscountPercentage(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

function getOriginalPrice(item, fallbackPrice = 0) {
  const rawBase = item && typeof item === "object" ? item.basePrice : undefined;
  const rawPrice = item && typeof item === "object" ? item.price : undefined;
  const baseValue = Number(rawBase ?? rawPrice ?? fallbackPrice ?? 0);
  return Number.isFinite(baseValue) ? baseValue : 0;
}

function getDiscountedPrice(item, fallbackPrice = 0) {
  const originalPrice = getOriginalPrice(item, fallbackPrice);
  const discount = normalizeDiscountPercentage(
    item && typeof item === "object" ? item.discountPercentage : 0,
  );

  if (!originalPrice || discount <= 0) {
    return originalPrice || Number(fallbackPrice) || 0;
  }

  const discounted = originalPrice * (1 - discount / 100);
  return Number(discounted.toFixed(2));
}

function applyDiscountToPrice(basePrice, discountPercentage) {
  const original = Number(basePrice) || 0;
  const discount = normalizeDiscountPercentage(discountPercentage);

  if (!original || discount <= 0) {
    return {
      basePrice: original,
      discountPercentage: discount,
      price: original,
    };
  }

  const discounted = original * (1 - discount / 100);
  return {
    basePrice: original,
    discountPercentage: discount,
    price: Number(discounted.toFixed(2)),
  };
}

function normalizeDateDiscounts(value) {
  let entries = value;
  if (typeof value === "string") {
    try {
      entries = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => ({
      startDate: String(entry?.startDate || "").trim(),
      endDate: String(entry?.endDate || "").trim(),
      discountPercentage: normalizeDiscountPercentage(
        entry?.discountPercentage,
      ),
    }))
    .filter(
      (entry) =>
        entry.startDate &&
        entry.endDate &&
        entry.discountPercentage > 0 &&
        entry.startDate <= entry.endDate,
    );
}

function getDateDiscount(item, checkIn, checkOut) {
  const discounts = normalizeDateDiscounts(item?.discounts);
  if (!checkIn) return 0;
  const stayStart = String(checkIn).slice(0, 10);
  const stayEnd = String(checkOut || checkIn).slice(0, 10);
  const matches = discounts.filter(
    (discount) =>
      stayStart >= discount.startDate &&
      stayStart <= discount.endDate &&
      stayEnd >= discount.startDate &&
      stayEnd <= discount.endDate,
  );
  return matches.length
    ? Math.max(...matches.map((discount) => discount.discountPercentage))
    : 0;
}

function getPriceForDates(item, checkIn, checkOut) {
  const basePrice = getOriginalPrice(item);
  const discount = getDateDiscount(item, checkIn, checkOut);
  return {
    original: basePrice,
    discountPercentage: discount,
    price: applyDiscountToPrice(basePrice, discount).price,
  };
}

module.exports = {
  normalizeDiscountPercentage,
  getOriginalPrice,
  getDiscountedPrice,
  applyDiscountToPrice,
  normalizeDateDiscounts,
  getDateDiscount,
  getPriceForDates,
};
