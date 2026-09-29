export function formatPrice(value: number): string {
  return `LKR ${value.toLocaleString()}`;
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

export function formatProductPrice(product: { price?: number; priceRange?: [number, number] }): string {
  if (product.priceRange) {
    const [min, max] = product.priceRange;
    return formatPriceRange(min, max);
  }
  return formatPrice(product.price ?? 0);
}
