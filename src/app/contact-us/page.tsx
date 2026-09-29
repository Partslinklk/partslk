import { Navbar } from "@/components/Navbar";
import { ContactPage } from "@/components/ContactPage";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ContactPage />
      <Footer />
      <ScrollTop />
    </div>
  );
}
