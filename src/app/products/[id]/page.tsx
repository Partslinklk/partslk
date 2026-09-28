import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProductDetail } from "@/components/ProductDetail";
import { ScrollTop } from "@/components/ScrollTop";
import { SHOP_PRODUCTS } from "@/lib/products-catalog";

export function generateStaticParams() {
  return SHOP_PRODUCTS.map((product) => ({ id: product.id }));
}

export async function generateMetadata(props: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const product = SHOP_PRODUCTS.find((p) => p.id === id);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function Page(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const product = SHOP_PRODUCTS.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ProductDetail product={product} />
      <ScrollTop />
    </div>
  );
}
