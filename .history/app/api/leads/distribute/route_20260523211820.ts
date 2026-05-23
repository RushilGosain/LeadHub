import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { leadId, useAutoAssignment } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status !== 'pending') {
      return NextResponse.json({ error: 'Lead is not in pending status' }, { status: 400 });
    }

    let assignedAgentId: string | null = null;

    if (useAutoAssignment) {
      // Get available agents sorted by:
      // 1. Is available
      // 2. Current workload (least calls received)
      // 3. Status (free > busy > offline)
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('is_available', true)
        .order('status', { ascending: false })
        .order('total_calls_received', { ascending: true });

      if (agentsError) {
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
      }

      if (agents && agents.length > 0) {
        assignedAgentId = agents[0].id;

        // Check if agent is working at this time
        const now = new Date();
        const dayOfWeek = now.getDay();
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const { data: schedule } = await supabase
          .from('agent_schedules')
          .select('*')
          .eq('agent_id', assignedAgentId)
          .eq('day_of_week', dayOfWeek)
          .single();

        if (schedule && schedule.is_working) {
          if (timeStr < schedule.start_time || timeStr > schedule.end_time) {
            // Agent is not working at this time, try next agent
            if (agents.length > 1) {
              assignedAgentId = agents[1].id;
            } else {
              assignedAgentId = null;
            }
          }
        }
      }
    }

    // Update the lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        assigned_agent_id: assignedAgentId,
        status: assignedAgentId ? 'assigned' : 'pending',
        assigned_at: assignedAgentId ? new Date().toISOString() : null,
      })
      .eq('id', leadId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to assign lead' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leadId,
      assignedAgentId,
    });
  } catch (error) {
    console.error('Error distributing lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
