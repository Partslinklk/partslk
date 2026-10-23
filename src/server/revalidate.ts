import { revalidatePath } from "next/cache";

/** Storefront pages read catalogue data through the root layout; call after any admin write. */
export const refreshStorefront = () => revalidatePath("/", "layout");
