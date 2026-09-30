import { Navbar } from "@/components/Navbar";
import { AccountPage } from "@/components/AccountPage";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <AccountPage />
      <Footer />
      <ScrollTop />
    </div>
  );
}
