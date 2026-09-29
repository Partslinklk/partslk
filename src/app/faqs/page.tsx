import { Navbar } from "@/components/Navbar";
import { FaqPage } from "@/components/FaqPage";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <FaqPage />
      <Footer />
      <ScrollTop />
    </div>
  );
}
