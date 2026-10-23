import { env } from "./env";

export const siteUrl = () => env().NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
