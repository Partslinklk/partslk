import { Navbar } from "@/components/Navbar";
import { PromoHero } from "@/components/PromoHero";
import { BrandStrip } from "@/components/BrandStrip";
import { ServiceStrip } from "@/components/ServiceStrip";
import { ShopByCategories } from "@/components/ShopByCategories";
import { DealOfWeek } from "@/components/DealOfWeek";
import { Testimonials } from "@/components/Testimonials";
import { PopularProducts } from "@/components/PopularProducts";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";
import { ScrollReveal } from "@/components/ScrollReveal";
import { NewsletterPopup } from "@/components/NewsletterPopup";
export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <Navbar />
      <PromoHero />
      <ServiceStrip />
      <ShopByCategories />
      <DealOfWeek />
      <BrandStrip />
      <Testimonials />
      <PopularProducts />
      <Footer />
      <ScrollTop />
      <NewsletterPopup />
      <ScrollReveal />
    </div>
  );
}
