import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  source: string;
  status: string;
  priority: number;
  assigned_agent_id: string | null;
  notes: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  total_calls_received: number;
  total_calls_completed: number;
  is_available: boolean;
}

interface DistributionRule {
  service: string;
  requiredAgents: string[]; // Agent IDs that MUST receive this service
  distributionMethod: 'round-robin' | 'fairness-based';
  maxLeadsPerAgent: number;
}

const distributionRules: DistributionRule[] = [
  {
    service: 'electrical',
    requiredAgents: [], // Add specific agent IDs here if needed
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
  {
    service: 'plumbing',
    requiredAgents: [],
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
  {
    service: 'carpentry',
    requiredAgents: [],
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
  {
    service: 'painting',
    requiredAgents: [],
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
  {
    service: 'hvac',
    requiredAgents: [],
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
  {
    service: 'cleaning',
    requiredAgents: [],
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
  {
    service: 'landscaping',
    requiredAgents: [],
    distributionMethod: 'fairness-based',
    maxLeadsPerAgent: 10,
  },
];

/**
 * POST /api/leads/auto-distribute
 * Automatically distributes leads to service providers based on:
 * 1. Service type matching
 * 2. Provider availability
 * 3. Fair distribution across providers (workload balancing)
 * 4. Predefined business rules
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all pending leads
    const { data: pendingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'pending')
      .is('assigned_agent_id', null);

    if (leadsError) {
      console.error('[v0] Error fetching leads:', leadsError);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Get all available agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('is_available', true);

    if (agentsError) {
      console.error('[v0] Error fetching agents:', agentsError);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { message: 'No available agents', distributed: 0 },
        { status: 200 }
      );
    }

    let distributedCount = 0;
    const distributions: Array<{ leadId: string; agentId: string }> = [];

    // Process each pending lead
    for (const lead of pendingLeads || []) {
      const rule = distributionRules.find((r) => r.service === lead.source);

      if (!rule) {
        console.warn(`[v0] No distribution rule found for service: ${lead.source}`);
        continue;
      }

      let selectedAgent: Agent | undefined;

      // Step 1: Check if there are required agents for this service
      if (rule.requiredAgents && rule.requiredAgents.length > 0) {
        const requiredAgents = agents.filter((a) =>
          rule.requiredAgents.includes(a.id)
        );
        if (requiredAgents.length > 0) {
          // Select the one with least workload
          selectedAgent = selectLeastBusyAgent(requiredAgents);
        }
      }

      // Step 2: If no required agent, use fairness-based distribution
      if (!selectedAgent && rule.distributionMethod === 'fairness-based') {
        const availableAgents = agents.filter(
          (a) =>
            a.total_calls_received < rule.maxLeadsPerAgent &&
            !distributions.some((d) => d.agentId === a.id && d.leadId === lead.id)
        );

        if (availableAgents.length > 0) {
          selectedAgent = selectFairestAgent(availableAgents);
        }
      }

      // Step 3: If still no agent, use round-robin
      if (!selectedAgent && agents.length > 0) {
        selectedAgent = selectRoundRobinAgent(agents);
      }

      if (selectedAgent) {
        distributions.push({
          leadId: lead.id,
          agentId: selectedAgent.id,
        });
        distributedCount++;
      }
    }

    // Apply all distributions
    if (distributions.length > 0) {
      const { error: updateError } = await supabase.from('leads').upsert(
        distributions.map((d) => ({
          id: d.leadId,
          assigned_agent_id: d.agentId,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
        }))
      );

      if (updateError) {
        console.error('[v0] Error updating leads:', updateError);
        return NextResponse.json(
          { error: 'Failed to assign leads' },
          { status: 500 }
        );
      }
    }

    console.log(`[v0] Successfully distributed ${distributedCount} leads`);

    return NextResponse.json(
      {
        message: 'Leads distributed successfully',
        distributed: distributedCount,
        total: pendingLeads?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Distribution error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Select the agent with the least current workload
 */
function selectLeastBusyAgent(agents: Agent[]): Agent {
  return agents.reduce((least, current) =>
    current.total_calls_received < least.total_calls_received ? current : least
  );
}

/**
 * Select agent based on fairness (considering completion rate and workload)
 */
function selectFairestAgent(agents: Agent[]): Agent {
  // Calculate fairness score: agents with higher completion rates get priority
  const scoredAgents = agents.map((agent) => {
    const completionRate =
      agent.total_calls_received > 0
        ? agent.total_calls_completed / agent.total_calls_received
        : 0;
    const workloadScore = agent.total_calls_received;
    const fairnessScore = completionRate * 100 - workloadScore * 0.5;
    return { agent, fairnessScore };
  });

  const bestAgent = scoredAgents.reduce((best, current) =>
    current.fairnessScore > best.fairnessScore ? current : best
  );

  return bestAgent.agent;
}

/**
 * Simple round-robin distribution
 */
let roundRobinIndex = 0;
function selectRoundRobinAgent(agents: Agent[]): Agent {
  const agent = agents[roundRobinIndex % agents.length];
  roundRobinIndex++;
  return agent;
}
