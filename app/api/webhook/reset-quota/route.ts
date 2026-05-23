/**
 * POST /api/webhook/reset-quota
 * ─────────────────────────────
 * Simulates a payment-gateway webhook that resets provider monthly quotas.
 *
 * IDEMPOTENCY: each call must include a unique `event_id`. Calling with
 * the same event_id multiple times has no additional effect.
 *
 * Must NOT be callable from normal user UI — only from test-tools page
 * or actual payment gateway via server-to-server call.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, provider_id } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: 'event_id is required for idempotency.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // --- Idempotency check ---
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, processed_at')
      .eq('event_id', event_id)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: `Event ${event_id} already processed at ${existingEvent.processed_at}. No changes made.`,
      });
    }

    // --- Record event FIRST (before any mutations) ---
    const { error: eventInsertErr } = await supabase.from('webhook_events').insert([
      {
        event_id,
        event_type: 'quota_reset',
        payload: body,
      },
    ]);

    if (eventInsertErr) {
      // Race condition: another request inserted first — treat as idempotent
      if (eventInsertErr.code === '23505') {
        return NextResponse.json({
          success: true,
          idempotent: true,
          message: 'Event already processed (race condition).',
        });
      }
      throw eventInsertErr;
    }

    // --- Reset quota ---
    let resetQuery = supabase
      .from('agents')
      .update({
        monthly_quota_used: 0,
        monthly_quota_limit: 10,
        quota_reset_at: new Date().toISOString(),
      });

    // If provider_id specified, reset only that provider; else reset all
    if (provider_id) {
      resetQuery = resetQuery.eq('id', provider_id);
    }

    const { error: resetErr, count } = await resetQuery.select();

    if (resetErr) throw resetErr;

    return NextResponse.json({
      success: true,
      idempotent: false,
      message: provider_id
        ? `Quota reset for provider ${provider_id}`
        : 'Quota reset for all providers',
      event_id,
    });
  } catch (err: any) {
    console.error('[webhook/reset-quota]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}