import { Navbar } from "@/components/Navbar";
import { ProductsPage } from "@/components/ProductsPage";
import { ScrollTop } from "@/components/ScrollTop";

export default async function Page(props: PageProps<"/products">) {
  const params = await props.searchParams;
  const raw = params.q;
  const q = Array.isArray(raw) ? raw[0] : raw;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ProductsPage initialQuery={q} />
      <ScrollTop />
    </div>
  );
}
