import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { agentId, dayOfWeek, startTime, endTime, isWorking } = await request.json();

    if (!agentId || dayOfWeek === undefined) {
      return NextResponse.json(
        { error: 'Agent ID and day of week are required' },
        { status: 400 }
      );
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 and 6' },
        { status: 400 }
      );
    }

    // Upsert schedule
    const { error } = await supabase
      .from('agent_schedules')
      .upsert(
        {
          agent_id: agentId,
          day_of_week: dayOfWeek,
          start_time: startTime || '09:00',
          end_time: endTime || '17:00',
          is_working: isWorking !== false,
        },
        {
          onConflict: 'agent_id,day_of_week',
        }
      );

    if (error) {
      return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule saved successfully',
    });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('agent_id', agentId)
      .order('day_of_week');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    return NextResponse.json({ schedules: data });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
