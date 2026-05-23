import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { leadId, agentId, callStatus, duration, notes } = await request.json();

    if (!leadId || !agentId) {
      return NextResponse.json(
        { error: 'Lead ID and Agent ID are required' },
        { status: 400 }
      );
    }

    // Get the lead to update its status
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Log the call
    const { error: callError } = await supabase.from('call_history').insert([
      {
        lead_id: leadId,
        agent_id: agentId,
        call_status: callStatus || 'completed',
        duration_seconds: duration || 0,
        notes: notes || null,
        end_time: new Date().toISOString(),
      },
    ]);

    if (callError) {
      return NextResponse.json({ error: 'Failed to log call' }, { status: 500 });
    }

    // Update lead status if call was completed
    if (callStatus === 'completed') {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Failed to update lead status:', updateError);
      }
    }

    // Update agent call counts
    const { error: agentError } = await supabase
      .from('agents')
      .update({
        total_calls_completed: lead.assigned_agent_id === agentId
          ? (lead.total_calls_completed || 0) + 1
          : undefined,
        total_calls_received: (lead.total_calls_received || 0) + 1,
      })
      .eq('id', agentId);

    if (agentError) {
      console.error('Failed to update agent stats:', agentError);
    }

    return NextResponse.json({
      success: true,
      leadId,
      callLogged: true,
    });
  } catch (error) {
    console.error('Error logging call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
