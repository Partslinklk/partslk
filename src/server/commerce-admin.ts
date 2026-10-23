import { z } from "zod";
import { query } from "./db";
import { idSchema } from "./validation/catalog";

const money = z.number().min(0).max(100_000_000);
const date = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date.");

export const couponSchema = z
  .object({
    code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only.").transform((v) => v.toUpperCase()),
    kind: z.enum(["percent", "fixed"]),
    value: z.number().gt(0).max(100_000_000),
    minSubtotal: money.default(0),
    maxUses: z.number().int().min(1).nullish(),
    startsAt: date.nullish(),
    expiresAt: date.nullish(),
    active: z.boolean().default(true),
  })
  .refine((c) => c.kind !== "percent" || c.value <= 100, { message: "A percentage can't exceed 100.", path: ["value"] });
export type CouponInput = z.infer<typeof couponSchema>;

const couponOut = (r: Record<string, unknown>) => ({
  code: r.code, kind: r.kind, value: r.value, minSubtotal: r.min_subtotal, maxUses: r.max_uses, used: r.used,
  startsAt: r.starts_at ? new Date(r.starts_at as string).toISOString() : null,
  expiresAt: r.expires_at ? new Date(r.expires_at as string).toISOString() : null,
  active: r.active,
});

export async function listCoupons() {
  return (await query("select * from coupons order by created_at desc, code")).rows.map(couponOut);
}
export async function getCoupon(code: string) {
  const r = (await query("select * from coupons where code = $1", [code.toUpperCase()])).rows[0];
  return r ? couponOut(r) : null;
}
export async function createCoupon(c: CouponInput) {
  const r = await query(
    `insert into coupons (code, kind, value, min_subtotal, max_uses, starts_at, expires_at, active)
     values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (code) do nothing`,
    [c.code, c.kind, c.value, c.minSubtotal, c.maxUses ?? null, c.startsAt ?? null, c.expiresAt ?? null, c.active],
  );
  return !!r.rowCount;
}
export async function updateCoupon(code: string, c: CouponInput) {
  const r = await query(
    `update coupons set kind=$2, value=$3, min_subtotal=$4, max_uses=$5, starts_at=$6, expires_at=$7, active=$8 where code=$1`,
    [code.toUpperCase(), c.kind, c.value, c.minSubtotal, c.maxUses ?? null, c.startsAt ?? null, c.expiresAt ?? null, c.active],
  );
  return !!r.rowCount;
}
export async function deleteCoupon(code: string) {
  return !!(await query("delete from coupons where code = $1", [code.toUpperCase()])).rowCount;
}

export const shippingSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(100),
  cost: money,
  freeOver: money.nullish(),
  minSubtotal: money.default(0),
  countries: z.array(z.string().trim().min(1).max(100)).max(300).default([]),
  active: z.boolean().default(true),
});
export type ShippingInput = z.infer<typeof shippingSchema>;

const shippingOut = (r: Record<string, unknown>) => ({
  id: r.id, label: r.label, cost: r.cost, freeOver: r.free_over, minSubtotal: r.min_subtotal, countries: r.countries, active: r.active,
});

export async function listShippingMethods() {
  return (await query("select * from shipping_methods order by position, id")).rows.map(shippingOut);
}
export async function getShippingMethod(id: string) {
  const r = (await query("select * from shipping_methods where id = $1", [id])).rows[0];
  return r ? shippingOut(r) : null;
}
export async function createShippingMethod(s: ShippingInput) {
  const r = await query(
    `insert into shipping_methods (id, label, cost, free_over, min_subtotal, countries, active, position)
     select $1,$2,$3,$4,$5,$6,$7, coalesce(max(position), -1) + 1 from shipping_methods on conflict (id) do nothing`,
    [s.id, s.label, s.cost, s.freeOver ?? null, s.minSubtotal, s.countries, s.active],
  );
  return !!r.rowCount;
}
export async function updateShippingMethod(id: string, s: ShippingInput) {
  const r = await query(
    "update shipping_methods set label=$2, cost=$3, free_over=$4, min_subtotal=$5, countries=$6, active=$7 where id=$1",
    [id, s.label, s.cost, s.freeOver ?? null, s.minSubtotal, s.countries, s.active],
  );
  return !!r.rowCount;
}
export async function deleteShippingMethod(id: string) {
  return !!(await query("delete from shipping_methods where id = $1", [id])).rowCount;
}
