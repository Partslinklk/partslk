"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard, StarRow } from "./ProductCard";
import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  PRICE_BANDS,
  SHOP_PRODUCTS,
  SIZE_OPTIONS,
} from "@/lib/products-catalog";

const PAGE_SIZE = 16;
type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";
type ViewMode = "grid" | "list";
type HighlightKey = "all" | "best-seller" | "new-arrival";
type FilterGroupKey = "categories" | "highlight" | "color" | "size" | "brand" | "price" | "rating";

function ToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12h14" />
      {collapsed ? <path d="M12 5v14" /> : null}
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterGroup({
  title,
  groupKey,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  groupKey: FilterGroupKey;
  collapsed: Record<FilterGroupKey, boolean>;
  onToggle: (key: FilterGroupKey) => void;
  children: React.ReactNode;
}) {
  const isCollapsed = collapsed[groupKey];
  return (
    <div className={`filter-group${isCollapsed ? " is-collapsed" : ""}`}>
      <div className="filter-group-head">
        <h3>{title}</h3>
        <button type="button" className="filter-toggle" onClick={() => onToggle(groupKey)} aria-label={`Toggle ${title}`}>
          <ToggleIcon collapsed={isCollapsed} />
        </button>
      </div>
      <div className="filter-group-body">{children}</div>
    </div>
  );
}

export function ProductsPage({ initialQuery }: { initialQuery?: string }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<HighlightKey>("all");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceBand, setPriceBand] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [collapsed, setCollapsed] = useState<Record<FilterGroupKey, boolean>>({
    categories: false,
    highlight: false,
    color: false,
    size: false,
    brand: false,
    price: false,
    rating: false,
  });

  const toggleGroup = (key: FilterGroupKey) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  const resetPaging = () => setVisibleCount(PAGE_SIZE);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opt of CATEGORY_OPTIONS) {
      counts[opt.id] = SHOP_PRODUCTS.filter((p) => p.categories.includes(opt.id)).length;
    }
    return counts;
  }, []);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const brand of BRAND_OPTIONS) {
      counts[brand] = SHOP_PRODUCTS.filter((p) => p.brand === brand).length;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    let list = SHOP_PRODUCTS.filter((product) => {
      if (initialQuery) {
        const q = initialQuery.toLowerCase();
        if (!product.name.toLowerCase().includes(q) && !product.brand.toLowerCase().includes(q)) return false;
      }
      if (selectedCategories.length && !selectedCategories.some((c) => product.categories.includes(c))) return false;
      if (highlight !== "all" && product.highlight !== highlight) return false;
      if (selectedColors.length && !selectedColors.some((c) => product.colors.includes(c))) return false;
      if (selectedSizes.length && !selectedSizes.includes(product.size)) return false;
      if (selectedBrands.length && !selectedBrands.includes(product.brand)) return false;
      if (priceBand) {
        const band = PRICE_BANDS.find((b) => b.id === priceBand);
        if (band && (product.price < band.min || product.price > band.max)) return false;
      }
      if (minRating > 0 && product.rating < minRating) return false;
      return true;
    });

    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        list.sort((a, b) => (b.highlight === "new-arrival" ? 1 : 0) - (a.highlight === "new-arrival" ? 1 : 0));
        break;
      default:
        break;
    }
    return list;
  }, [initialQuery, selectedCategories, highlight, selectedColors, selectedSizes, selectedBrands, priceBand, minRating, sort]);

  const visible = filtered.slice(0, visibleCount);
  const total = filtered.length;

  const heading = initialQuery ? (
    <>
      Search Results for: <span>&ldquo;{initialQuery}&rdquo;</span>
    </>
  ) : (
    "Shop All Products"
  );

  return (
    <>
      <section className="sr-titleband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span className="crumb-now">{initialQuery ? "Search Results" : "Shop"}</span>
          </div>
          <div className="sr-resulthead">
            <h1>{heading}</h1>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="page results-page">
          <div className="sr-layout">
            <aside className="sr-filters">
          <FilterGroup title="Shop By Categories" groupKey="categories" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="check-list cats-scroll">
              <label>
                <input
                  type="checkbox"
                  checked={selectedCategories.length === 0}
                  onChange={() => {
                    setSelectedCategories([]);
                    resetPaging();
                  }}
                />
                <span>Our Store</span>
                <span className="check-list-count">({SHOP_PRODUCTS.length})</span>
              </label>
              {CATEGORY_OPTIONS.map((cat) => (
                <label key={cat.id}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => {
                      setSelectedCategories((prev) => toggle(prev, cat.id));
                      resetPaging();
                    }}
                  />
                  <span>{cat.name}</span>
                  <span className="check-list-count">({categoryCounts[cat.id]})</span>
                </label>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Highlight" groupKey="highlight" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="filter-list">
              {(
                [
                  { key: "all", label: "All Products" },
                  { key: "best-seller", label: "Best Seller" },
                  { key: "new-arrival", label: "New Arrivals" },
                ] as { key: HighlightKey; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={highlight === opt.key ? "is-active" : ""}
                  onClick={() => {
                    setHighlight(opt.key);
                    resetPaging();
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Filter By Color" groupKey="color" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="color-swatch-list">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`color-swatch${selectedColors.includes(color.id) ? " is-active" : ""}`}
                  style={{ background: color.hex, borderColor: color.id === "white" ? "var(--n-border)" : color.hex }}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => {
                    setSelectedColors((prev) => toggle(prev, color.id));
                    resetPaging();
                  }}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Filter By Size" groupKey="size" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="size-pill-list">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-pill${selectedSizes.includes(size) ? " is-active" : ""}`}
                  onClick={() => {
                    setSelectedSizes((prev) => toggle(prev, size));
                    resetPaging();
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Brands" groupKey="brand" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="check-list">
              {BRAND_OPTIONS.map((brand) => (
                <label key={brand}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => {
                      setSelectedBrands((prev) => toggle(prev, brand));
                      resetPaging();
                    }}
                  />
                  <span>{brand}</span>
                  <span className="check-list-count">({brandCounts[brand]})</span>
                </label>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Price Filter" groupKey="price" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="filter-list">
              <button type="button" className={priceBand === null ? "is-active" : ""} onClick={() => { setPriceBand(null); resetPaging(); }}>
                All
              </button>
              {PRICE_BANDS.map((band) => (
                <button
                  key={band.id}
                  type="button"
                  className={priceBand === band.id ? "is-active" : ""}
                  onClick={() => {
                    setPriceBand(band.id);
                    resetPaging();
                  }}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Average Rating" groupKey="rating" collapsed={collapsed} onToggle={toggleGroup}>
            <div className="rating-list">
              {[4, 3, 2, 1].map((r) => {
                const count = SHOP_PRODUCTS.filter((p) => p.rating >= r).length;
                return (
                  <label key={r}>
                    <input type="radio" name="rating" checked={minRating === r} onChange={() => { setMinRating(r); resetPaging(); }} />
                    <span className="stars">
                      <StarRow rating={r} />
                    </span>
                    <em>& up ({count})</em>
                  </label>
                );
              })}
              <label>
                <input type="radio" name="rating" checked={minRating === 0} onChange={() => { setMinRating(0); resetPaging(); }} />
                <span>Any Rating</span>
              </label>
            </div>
          </FilterGroup>
        </aside>

        <div className="sr-main">
          <div className="sr-sortbar">
            <span className="sr-count">
              Showing 1–{visible.length} of {total} results
            </span>
            <div className="sort-right">
              <select className="sr-sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort products">
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Average Rating</option>
                <option value="newest">Newest</option>
              </select>
              <div className="sr-view-toggle">
                <button
                  type="button"
                  className={`sr-view-btn${view === "grid" ? " is-active" : ""}`}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                >
                  <GridIcon />
                </button>
                <button
                  type="button"
                  className={`sr-view-btn${view === "list" ? " is-active" : ""}`}
                  onClick={() => setView("list")}
                  aria-label="List view"
                >
                  <ListIcon />
                </button>
              </div>
            </div>
          </div>

          {visible.length > 0 ? (
            <div className={`sr-grid${view === "list" ? " is-list" : ""}`}>
              {visible.map((product) => (
                <ProductCard product={product} view={view} key={product.id} />
              ))}
            </div>
          ) : (
            <p className="sr-resulthead">No products match these filters.</p>
          )}

          {visibleCount < total ? (
            <div className="sp-loadmore-wrap">
              <button type="button" className="sp-loadmore" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Load More
              </button>
            </div>
          ) : null}
        </div>
          </div>
        </div>
      </div>
    </>
  );
}
