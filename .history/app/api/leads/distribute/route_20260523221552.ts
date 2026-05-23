/**
 * POST /api/leads/distribute
 * ──────────────────────────
 * Distributes all pending/unassigned leads.
 * Can be called manually or from cron.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { distributeLead } from '@/lib/distribution-engine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: pendingLeads, error } = await supabase
      .from('leads')
      .select('id, source')
      .eq('status', 'pending');

    if (error) throw error;

    const results = [];
    for (const lead of pendingLeads || []) {
      try {
        const result = await distributeLead(supabase, lead.id, lead.source);
        results.push(result);
      } catch (e: any) {
        results.push({ leadId: lead.id, error: e.message });
      }
    }

    return NextResponse.json({ distributed: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}