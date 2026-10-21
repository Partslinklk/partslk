import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "@/admin/styles/admin.css";
import { AdminProviders } from "@/admin/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter-nf", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope-nf", display: "swap" });

export const metadata: Metadata = {
  title: "Shadcn Admin",
  description: "Admin Dashboard UI built with Shadcn.",
  icons: {
    icon: [
      { url: "/admin/images/favicon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/admin/images/favicon_light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/admin/images/favicon.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/admin/images/favicon_light.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
