"use client";

import { ProductCard } from "./ProductCard";
import { type ShopProduct } from "@/lib/products-catalog";
import { useStoreData } from "@/lib/store-context";

const RELATED_COUNT = 5;

function relatedProducts(SHOP_PRODUCTS: ShopProduct[], product: ShopProduct): ShopProduct[] {
  const sameCategory = SHOP_PRODUCTS.filter(
    (p) => p.id !== product.id && p.categories.some((c) => product.categories.includes(c))
  );
  if (sameCategory.length >= RELATED_COUNT) return sameCategory.slice(0, RELATED_COUNT);

  const fallback = SHOP_PRODUCTS.filter((p) => p.id !== product.id && !sameCategory.includes(p));
  return [...sameCategory, ...fallback].slice(0, RELATED_COUNT);
}

export function ProductRelated({ product }: { product: ShopProduct }) {
  const { products } = useStoreData();
  const related = relatedProducts(products, product);
  if (!related.length) return null;

  return (
    <div className="pd-related">
      <h2>Related products</h2>
      <div className="rec-grid">
        {related.map((p) => (
          <ProductCard product={p} key={p.id} />
        ))}
      </div>
    </div>
  );
}
