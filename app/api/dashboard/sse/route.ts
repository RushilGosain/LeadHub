/**
 * GET /api/dashboard/sse
 * ──────────────────────
 * Server-Sent Events endpoint for real-time dashboard updates.
 * Polls Supabase every 3 seconds for new lead_assignments and pushes
 * changes to connected clients.
 *
 * This avoids needing a Supabase Realtime subscription on the server
 * while still delivering sub-5s updates.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get('provider_id');

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch (_) {
          closed = true;
        }
      };

      // Send initial ping
      send({ type: 'connected', timestamp: Date.now() });

      const supabase = await createClient();
      let lastCheck = new Date(Date.now() - 10_000).toISOString();

      const poll = async () => {
        if (closed) return;

        try {
          const now = new Date().toISOString();

          // Query for new assignments since last check
          let query = supabase
            .from('lead_assignments')
            .select(`
              id,
              lead_id,
              provider_id,
              assigned_at,
              leads!lead_assignments_lead_id_fkey (
                id,
                customer_name,
                customer_phone,
                customer_email,
                source,
                city,
                notes,
                status,
                priority,
                created_at
              )
            `)
            .gte('assigned_at', lastCheck)
            .order('assigned_at', { ascending: true });

          if (providerId) {
            query = query.eq('provider_id', providerId);
          }

          const { data, error } = await query;

          if (!error && data && data.length > 0) {
            lastCheck = now;
            send({ type: 'new_assignments', data, timestamp: Date.now() });
          } else {
            // Still send heartbeat so client knows connection is alive
            send({ type: 'heartbeat', timestamp: Date.now() });
          }
        } catch (e) {
          // Supabase might throw on cold starts — just skip
        }

        if (!closed) {
          setTimeout(poll, 3000);
        }
      };

      // Start polling
      setTimeout(poll, 1000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        closed = true;
        try { controller.close(); } catch (_) {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}