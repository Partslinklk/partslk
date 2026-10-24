import { requireAdmin } from "@/server/admin";
import { dashboardData } from "@/server/dashboard";
import { scheduleHousekeeping } from "@/server/housekeeping";
import { handle, json } from "@/server/http";

/** Dashboard numbers for the last N days: GET /api/admin/dashboard?days=14 (7, 14, 30 or 90). */
export const GET = handle(async (request: Request) => {
  await requireAdmin(request);
  scheduleHousekeeping();
  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = [7, 14, 30, 90].includes(requested) ? requested : 14;
  return json(await dashboardData(days));
});
