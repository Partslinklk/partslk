import { Navbar } from "@/components/Navbar";
import { PromoHero } from "@/components/PromoHero";
import { BrandStrip } from "@/components/BrandStrip";
import { ShopByCategories } from "@/components/ShopByCategories";
import { DealOfWeek } from "@/components/DealOfWeek";
import { Testimonials } from "@/components/Testimonials";
import { PopularProducts } from "@/components/PopularProducts";
import { ScrollTop } from "@/components/ScrollTop";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PromoHero />
      <BrandStrip />
      <ShopByCategories />
      <DealOfWeek />
      <Testimonials />
      <PopularProducts />
      <ScrollTop />
    </div>
  );
}
