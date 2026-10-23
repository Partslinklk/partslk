"use client";

import { useState } from "react";
import { ImageSlot } from "./ImageSlot";
import { ProductReviews } from "./ProductReviews";
import { COLOR_OPTIONS, type ShopProduct } from "@/lib/products-catalog";
import { useStoreData } from "@/lib/store-context";
import { formatPrice } from "@/lib/format-price";

type TabKey = "description" | "info" | "reviews";

export function ProductTabs({ product, stock }: { product: ShopProduct; stock: number }) {
  const { categories: CATEGORY_OPTIONS } = useStoreData();
  const [tab, setTab] = useState<TabKey>("description");

  const categoryNames = product.categories
    .map((id) => CATEGORY_OPTIONS.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const colorNames = product.colors
    .map((id) => COLOR_OPTIONS.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const reviewWord = product.reviewCount === 1 ? "review" : "reviews";

  const bullets = [
    { label: "Product Overview", text: product.description },
    colorNames.length ? { label: "Color Options", text: `Available in ${colorNames.join(", ")}.` } : null,
    {
      label: "Fitment",
      text: `${product.size} sizing, suited for ${categoryNames.join(" & ") || "a wide range of"} applications.`,
    },
    { label: "Customer Rated", text: `${product.rating} / 5 stars from ${product.reviewCount} ${reviewWord}.` },
    { label: "Ready To Ship", text: `${stock} units currently in stock.` },
  ].filter((b): b is { label: string; text: string } => Boolean(b));

  const specRows: [string, string][] = [
    ["Brand", product.brand],
    ["SKU", product.id],
    ["Category", categoryNames.join(", ") || "—"],
    ["Color Options", colorNames.join(", ") || "—"],
    ["Size", product.size],
    ["Price", formatPrice(product.price)],
    ["Rating", `${product.rating} / 5 (${product.reviewCount} ${reviewWord})`],
    ["Stock Status", `${stock} in stock`],
  ];

  return (
    <div className="pdp-tabs">
      <div className="pdp-tablist" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "description"}
          className={`pdp-tabbtn${tab === "description" ? " is-active" : ""}`}
          onClick={() => setTab("description")}
        >
          Description
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "info"}
          className={`pdp-tabbtn${tab === "info" ? " is-active" : ""}`}
          onClick={() => setTab("info")}
        >
          Additional information
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={`pdp-tabbtn${tab === "reviews" ? " is-active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Reviews ({product.reviewCount})
        </button>
      </div>

      <div className="pdp-tabpanel">
        {tab === "description" ? (
          <div className="pdp-about">
            <h2>About this item</h2>
            <p>{product.description}</p>
            <p>
              Every {product.brand} part in our catalog is inspected before it ships, backed by our lowest-price
              guarantee and free returns on orders over {formatPrice(200)}.
            </p>

            <div className="pdp-tabbanner">
              <ImageSlot src="/car-brake-banner.jpg" alt="" shape="rect" />
              <div className="pdp-tabbanner-copy">
                <strong>Genuine Parts For Every Make &amp; Model</strong>
                <span>Sourced, quality-checked, and shipped fast by PartsLink</span>
              </div>
            </div>

            <ul className="pdp-bullets">
              {bullets.map((b) => (
                <li key={b.label} className="pdp-bullet">
                  <strong>{b.label.toUpperCase()}: </strong>
                  {b.text}
                </li>
              ))}
            </ul>

            <p className="pdp-spec-title">Technical Details</p>
            <table className="pdp-spectable">
              <tbody>
                {specRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "info" ? (
          <table className="pdp-spectable">
            <tbody>
              <tr>
                <td>Size</td>
                <td>{product.size}</td>
              </tr>
              <tr>
                <td>Color Options</td>
                <td>{colorNames.join(", ") || "—"}</td>
              </tr>
              <tr>
                <td>Category</td>
                <td>{categoryNames.join(", ") || "—"}</td>
              </tr>
              <tr>
                <td>Brand</td>
                <td>{product.brand}</td>
              </tr>
            </tbody>
          </table>
        ) : null}

        {tab === "reviews" ? <ProductReviews productId={product.id} productName={product.name} /> : null}
      </div>
    </div>
  );
}
