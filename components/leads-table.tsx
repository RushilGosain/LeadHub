'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface LeadsTableProps {
  refreshKey: number;
}

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  source: string;
  city: string;
  status: string;
  priority: number;
  assigned_agent_id: string | null;
  created_at: string;
}

interface Assignment {
  lead_id: string;
  provider_id: string;
  agents: { name: string } | null;
}

const statusColors: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  assigned:  'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<number, string> = { 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Urgent' };

export default function LeadsTable({ refreshKey }: LeadsTableProps) {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [leadsRes, assignRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase
          .from('lead_assignments')
          .select('lead_id, provider_id, agents!lead_assignments_provider_id_fkey(name)'),
      ]);
      setLeads(leadsRes.data || []);
      setAssignments(assignRes.data as unknown as Assignment[] || []);
      setLoading(false);
    };

    fetchData();
  }, [supabase, refreshKey]);

  const getAssignedProviders = (leadId: string) =>
    assignments
      .filter((a) => a.lead_id === leadId)
      .map((a) => (a.agents as any)?.name || a.provider_id);

  if (loading) return <div className="text-center text-slate-600">Loading leads...</div>;
  if (leads.length === 0) return <div className="text-center text-slate-600 py-8">No leads yet</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Customer</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Service</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">City</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Assigned Providers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {leads.map((lead) => {
            const providers = getAssignedProviders(lead.id);
            return (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900 font-medium">{lead.customer_name}</td>
                <td className="px-4 py-3 text-slate-600">{lead.customer_phone}</td>
                <td className="px-4 py-3 text-slate-600 capitalize">{lead.source}</td>
                <td className="px-4 py-3 text-slate-600">{lead.city || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {priorityLabels[lead.priority] || 'Low'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[lead.status] || ''}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {providers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {providers.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-100">
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">Unassigned</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}