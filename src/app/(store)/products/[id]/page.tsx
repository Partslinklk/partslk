import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProductDetail } from "@/components/ProductDetail";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";
import { readCollection } from "@/lib/db";
import type { ShopProduct } from "@/lib/products-catalog";

async function findProduct(id: string) {
  const products = await readCollection<ShopProduct>("products");
  return products.find((p) => p.id === id && p.published !== false);
}

export async function generateMetadata(props: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const product = await findProduct(id);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function Page(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const product = await findProduct(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ProductDetail product={product} />
      <Footer />
      <ScrollTop />
    </div>
  );
}
