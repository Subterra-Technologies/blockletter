import { isIsoDate } from '@subterra-technologies/blockletter';
import type { NextRequest } from 'next/server';
import { listEvents } from '@/lib/events';

/**
 * `GET /api/events?from=YYYY-MM-DD&until=YYYY-MM-DD`: the events between two dates. The editor's
 * events source calls it from the browser to refresh the event tiles and fill their picker.
 */
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from');
  const until = request.nextUrl.searchParams.get('until');
  if (!isIsoDate(from) || !isIsoDate(until)) {
    return Response.json({ error: 'Pass from and until as YYYY-MM-DD dates.' }, { status: 400 });
  }
  return Response.json(await listEvents({ from, until }));
}
