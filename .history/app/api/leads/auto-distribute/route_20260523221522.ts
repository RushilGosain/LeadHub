/**
 * POST /api/leads/auto-distribute
 * ────────────────────────────────
 * Updated to use the fair distribution engine.
 * Kept at this URL for backward compatibility with existing callers.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { distributeLead } from '@/lib/distribution-engine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Distribute all pending leads
    const { data: pendingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, source')
      .eq('status', 'pending')
      .is('assigned_agent_id', null);

    if (leadsError) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    let distributed = 0;
    const results = [];

    for (const lead of pendingLeads || []) {
      try {
        const result = await distributeLead(supabase, lead.id, lead.source);
        if (!result.skipped) distributed++;
        results.push(result);
      } catch (e: any) {
        results.push({ leadId: lead.id, error: e.message });
      }
    }

    return NextResponse.json({
      message: 'Leads distributed',
      distributed,
      total: pendingLeads?.length || 0,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}