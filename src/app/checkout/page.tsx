import { Navbar } from "@/components/Navbar";
import { CheckoutPage } from "@/components/CheckoutPage";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";
import { getCountries } from "@/lib/countries";

export default async function Page() {
  const countries = await getCountries();
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <CheckoutPage countries={countries.map(({ code, name }) => ({ code, name }))} />
      <Footer />
      <ScrollTop />
    </div>
  );
}
