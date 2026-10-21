import { Navbar } from "@/components/Navbar";
import { AboutPage } from "@/components/AboutPage";
import { AboutGallery } from "@/components/AboutGallery";
import { AboutVision } from "@/components/AboutVision";
import { AboutStats } from "@/components/AboutStats";
import { AboutCta } from "@/components/AboutCta";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <AboutPage />
      <AboutGallery />
      <AboutVision />
      <AboutStats />
      <AboutCta />
      <Footer />
      <ScrollTop />
    </div>
  );
}
