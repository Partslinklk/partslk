import { query } from "./db";

export async function deleteOrder(id: string): Promise<boolean> {
  return !!(await query("delete from orders where id = $1", [id])).rowCount;
}
