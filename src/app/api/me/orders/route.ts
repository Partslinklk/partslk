import { readCustomerOrders } from "@/lib/db";
import { requireCustomer } from "@/server/customer-auth";
import { handle, json } from "@/server/http";

export const GET = handle(async () => json(await readCustomerOrders((await requireCustomer()).id)));
