/**
 * POST /api/leads/submit
 * ─────────────────────
 * Accepts customer form data, enforces duplicate rule, saves lead,
 * then triggers fair distribution.
 *
 * Duplicate rule (DB-enforced): same phone + same service not allowed.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { distributeLead } from '@/lib/distribution-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, city, service, description } = body;

    // Basic validation
    if (!name || !phone || !city || !service || !description) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // --- Duplicate check (belt + suspenders on top of DB constraint) ---
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('customer_phone', phone.trim())
      .eq('source', service)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `A request for "${service}" from this phone number already exists. You cannot submit the same service twice.`,
          code: 'DUPLICATE_LEAD',
        },
        { status: 409 }
      );
    }

    // --- Insert lead ---
    const { data: lead, error: insertErr } = await supabase
      .from('leads')
      .insert([
        {
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: body.email?.trim() || null,
          source: service,
          city: city.trim(),
          notes: description.trim(),
          status: 'pending',
          priority: 1,
        },
      ])
      .select('id')
      .single();

    if (insertErr) {
      // Unique violation from DB constraint
      if (insertErr.code === '23505') {
        return NextResponse.json(
          {
            error: `A request for "${service}" from this phone number already exists.`,
            code: 'DUPLICATE_LEAD',
          },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    // --- Trigger fair distribution ---
    try {
      const result = await distributeLead(supabase, lead.id, service);
      return NextResponse.json({
        success: true,
        leadId: lead.id,
        assignedProviders: result.assigned.length,
        distributionResult: result,
      });
    } catch (distErr: any) {
      // Distribution failed but lead is saved — don't fail the request
      console.error('[distribute] Error during distribution:', distErr.message);
      return NextResponse.json({
        success: true,
        leadId: lead.id,
        assignedProviders: 0,
        warning: 'Lead saved but distribution encountered an error.',
      });
    }
  } catch (err: any) {
    console.error('[submit] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}