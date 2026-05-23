'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;
  phone_number: string;
  total_calls_received: number;
  total_calls_completed: number;
  is_available: boolean;
  monthly_quota_used: number;
  monthly_quota_limit: number;
}

const statusColors = {
  offline: 'bg-gray-100 text-gray-800',
  free:    'bg-green-100 text-green-800',
  busy:    'bg-red-100 text-red-800',
};

export default function AgentsList() {
  const supabase = createClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      const { data } = await supabase.from('agents').select('*').order('name');
      setAgents(data || []);
      setLoading(false);
    };

    fetchAgents();

    const channel = supabase
      .channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAgents((prev) => [...prev, payload.new as Agent]);
        } else if (payload.eventType === 'UPDATE') {
          setAgents((prev) => prev.map((a) => (a.id === payload.new.id ? (payload.new as Agent) : a)));
        } else if (payload.eventType === 'DELETE') {
          setAgents((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [supabase]);

  const handleToggleAvailable = async (agentId: string, isAvailable: boolean) => {
    const { error } = await supabase
      .from('agents')
      .update({ is_available: !isAvailable })
      .eq('id', agentId);
    if (error) alert(`Error: ${error.message}`);
  };

  if (loading) return <div className="text-center text-slate-600">Loading agents...</div>;
  if (agents.length === 0) return <div className="text-center text-slate-600 py-8">No agents yet</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => {
        const quotaUsed  = agent.monthly_quota_used  ?? 0;
        const quotaLimit = agent.monthly_quota_limit ?? 10;
        const quotaPct   = Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));
        const remaining  = quotaLimit - quotaUsed;

        return (
          <Card key={agent.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                <p className="text-sm text-slate-600">{agent.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[agent.status as keyof typeof statusColors] || statusColors.offline}`}>
                {agent.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-600 mb-3">
              <div><span className="font-medium">Phone:</span> {agent.phone_number || 'N/A'}</div>
              <div><span className="font-medium">Leads Received:</span> {agent.total_calls_received}</div>
              <div><span className="font-medium">Completed:</span> {agent.total_calls_completed}</div>
            </div>

            {/* Quota bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Monthly Quota</span>
                <span className={remaining === 0 ? 'text-red-600 font-semibold' : 'text-slate-700 font-medium'}>
                  {remaining} remaining
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${quotaPct >= 100 ? 'bg-red-500' : quotaPct >= 70 ? 'bg-amber-500' : 'bg-violet-500'}`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{quotaUsed}/{quotaLimit} used</div>
            </div>

            <button
              onClick={() => handleToggleAvailable(agent.id, agent.is_available)}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
                agent.is_available
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {agent.is_available ? 'Available' : 'Not Available'}
            </button>
          </Card>
        );
      })}
    </div>
  );
}