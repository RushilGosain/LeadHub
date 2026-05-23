'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface LeadsTableProps {
  refreshKey: number;
}

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  source: string;
  status: string;
  priority: number;
  assigned_agent_id: string | null;
  created_at: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Urgent',
};

export default function LeadsTable({ refreshKey }: LeadsTableProps) {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const [leadsRes, agentsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('agents').select('id, name, status'),
      ]);

      setLeads(leadsRes.data || []);
      setAgents(agentsRes.data || []);
      setLoading(false);
    };

    fetchLeads();
  }, [supabase, refreshKey]);

  const handleAssignLead = async (leadId: string, agentId: string) => {
    const { error } = await supabase
      .from('leads')
      .update({
        assigned_agent_id: agentId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    setLeads(leads.map((lead) => (lead.id === leadId ? { ...lead, assigned_agent_id: agentId, status: 'assigned' } : lead)));
  };

  if (loading) {
    return <div className="text-center text-slate-600">Loading leads...</div>;
  }

  if (leads.length === 0) {
    return <div className="text-center text-slate-600 py-8">No leads yet</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Customer</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Source</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Assigned Agent</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-900 font-medium">{lead.customer_name}</td>
              <td className="px-4 py-3 text-slate-600">{lead.customer_phone}</td>
              <td className="px-4 py-3 text-slate-600">{lead.source}</td>
              <td className="px-4 py-3">
                <span className="text-xs font-semibold text-slate-700">{priorityLabels[lead.priority as keyof typeof priorityLabels]}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[lead.status as keyof typeof statusColors]}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {lead.assigned_agent_id ? (
                  <span className="text-slate-600 text-sm">{agents.find((a) => a.id === lead.assigned_agent_id)?.name || 'Unknown'}</span>
                ) : (
                  <span className="text-slate-400 text-sm">Unassigned</span>
                )}
              </td>
              <td className="px-4 py-3">
                {lead.status === 'pending' && (
                  <select
                    onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none"
                    defaultValue=""
                  >
                    <option value="">Assign to...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.status})
                      </option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
