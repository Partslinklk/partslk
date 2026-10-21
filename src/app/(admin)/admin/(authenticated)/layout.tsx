import { cookies } from "next/headers";
import { AuthenticatedLayout } from "@/admin/components/layout/authenticated-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <AuthenticatedLayout defaultOpen={defaultOpen}>{children}</AuthenticatedLayout>;
}
