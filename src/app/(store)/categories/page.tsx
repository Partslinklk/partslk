import { Navbar } from "@/components/Navbar";
import { CategoriesPage } from "@/components/CategoriesPage";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <CategoriesPage />
      <Footer />
      <ScrollTop />
    </div>
  );
}
