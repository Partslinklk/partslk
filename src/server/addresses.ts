import { z } from "zod";
import { query, tx } from "./db";

export const addressSchema = z.object({
  label: z.string().trim().max(50).default("Home"),
  firstName: z.string().trim().max(100).default(""),
  lastName: z.string().trim().max(100).default(""),
  phone: z.string().trim().max(50).default(""),
  country: z.string().trim().min(1, "Country is required.").max(100),
  address: z.string().trim().min(1, "Address is required.").max(300),
  city: z.string().trim().min(1, "City is required.").max(100),
  postcode: z.string().trim().min(1, "Postcode is required.").max(30),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const MAX_ADDRESSES = 10;

type Row = Record<string, unknown>;
const map = (r: Row) => ({
  id: r.id,
  label: r.label,
  firstName: r.first_name,
  lastName: r.last_name,
  phone: r.phone,
  country: r.country,
  address: r.address,
  city: r.city,
  postcode: r.postcode,
  isDefault: r.is_default,
});

export async function listAddresses(customerId: string) {
  const { rows } = await query("select * from customer_addresses where customer_id = $1 order by is_default desc, created_at", [customerId]);
  return rows.map(map);
}

export async function getAddress(customerId: string, id: string) {
  const { rows } = await query("select * from customer_addresses where customer_id = $1 and id = $2", [customerId, id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function countAddresses(customerId: string) {
  return (await query<{ n: number }>("select count(*)::int n from customer_addresses where customer_id = $1", [customerId])).rows[0].n;
}

export function createAddress(customerId: string, a: AddressInput) {
  return tx(async (c) => {
    // The first address a customer saves becomes their default.
    const first = (await c.query("select 1 from customer_addresses where customer_id = $1 limit 1", [customerId])).rowCount === 0;
    const makeDefault = a.isDefault || first;
    if (makeDefault) await c.query("update customer_addresses set is_default = false where customer_id = $1", [customerId]);
    const { rows } = await c.query(
      `insert into customer_addresses (customer_id, label, first_name, last_name, phone, country, address, city, postcode, is_default)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [customerId, a.label, a.firstName, a.lastName, a.phone, a.country, a.address, a.city, a.postcode, makeDefault],
    );
    return map(rows[0]);
  });
}

export function updateAddress(customerId: string, id: string, a: AddressInput) {
  return tx(async (c) => {
    if (a.isDefault) await c.query("update customer_addresses set is_default = false where customer_id = $1 and id <> $2", [customerId, id]);
    const { rows } = await c.query(
      `update customer_addresses set label=$3, first_name=$4, last_name=$5, phone=$6, country=$7, address=$8,
              city=$9, postcode=$10, is_default=$11 where customer_id = $1 and id = $2 returning *`,
      [customerId, id, a.label, a.firstName, a.lastName, a.phone, a.country, a.address, a.city, a.postcode, a.isDefault],
    );
    return rows[0] ? map(rows[0]) : null;
  });
}

export function deleteAddress(customerId: string, id: string) {
  return tx(async (c) => {
    const del = await c.query("delete from customer_addresses where customer_id = $1 and id = $2 returning is_default", [customerId, id]);
    if (!del.rowCount) return false;
    if (del.rows[0].is_default) {
      // Promote the oldest remaining address so the customer always has a default.
      await c.query(
        `update customer_addresses set is_default = true
          where id = (select id from customer_addresses where customer_id = $1 order by created_at limit 1)`,
        [customerId],
      );
    }
    return true;
  });
}
