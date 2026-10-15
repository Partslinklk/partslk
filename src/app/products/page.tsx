import { Navbar } from "@/components/Navbar";
import { ProductsPage } from "@/components/ProductsPage";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";

export default async function Page(props: PageProps<"/products">) {
  const params = await props.searchParams;
  const raw = params.q;
  const q = Array.isArray(raw) ? raw[0] : raw;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ProductsPage
        key={JSON.stringify(params)}
        initialQuery={q}
        initialCategory={first(params.category)}
        initialBrand={first(params.brand)}
        initialPrice={first(params.price)}
      />
      <Footer />
      <ScrollTop />
    </div>
  );
}
