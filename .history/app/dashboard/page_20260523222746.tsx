'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  RefreshCw, Bell, LogOut, Phone, MapPin, Clock,
  CheckCircle, Circle, AlertCircle, User, TrendingUp, Zap,
} from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  email: string;
  status: string;
  monthly_quota_limit: number;
  monthly_quota_used: number;
  is_available: boolean;
}

interface LeadAssignment {
  id: string;
  lead_id: string;
  assigned_at: string;
  leads: {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    source: string;
    city: string;
    notes: string;
    status: string;
    priority: number;
    created_at: string;
  } | null;
}

const SERVICE_LABELS: Record<string, string> = {
  plumbing: '🔧 Plumbing',
  electrical: '⚡ Electrical',
  carpentry: '🪚 Carpentry',
  painting: '🎨 Painting',
  hvac: '❄️ HVAC',
  cleaning: '🧹 Cleaning',
  landscaping: '🌿 Landscaping',
  other: '🔨 Other',
};

const PRIORITY_COLORS = ['bg-slate-100 text-slate-600', 'bg-blue-100 text-blue-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700'];
const PRIORITY_LABELS = ['Low', 'Medium', 'High', 'Urgent'];

export default function DashboardPage() {
  const supabase = createClient();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [newCount, setNewCount] = useState(0);
  const sseRef = useRef<EventSource | null>(null);
  const lastSeenRef = useRef<Set<string>>(new Set());

  // ── Auth + load provider ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/auth/login'; return; }

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (agentData) {
        setProvider(agentData);
        await loadAssignments(agentData.id);
        startSSE(agentData.id);
      }
      setLoading(false);
    };
    init();
    return () => sseRef.current?.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAssignments = useCallback(async (providerId: string) => {
    const { data } = await supabase
      .from('lead_assignments')
      .select(`
        id, lead_id, assigned_at,
        leads!lead_assignments_lead_id_fkey (
          id, customer_name, customer_phone, customer_email,
          source, city, notes, status, priority, created_at
        )
      `)
      .eq('provider_id', providerId)
      .order('assigned_at', { ascending: false });

    if (data) {
      setAssignments(data as unknown as LeadAssignment[]);
      data.forEach((d) => lastSeenRef.current.add(d.id));
    }
  }, [supabase]);

  // ── SSE for real-time updates ─────────────────────────────────────
  const startSSE = useCallback((providerId: string) => {
    if (sseRef.current) sseRef.current.close();

    const es = new EventSource(`/api/dashboard/sse?provider_id=${providerId}`);
    sseRef.current = es;

    es.onopen = () => setLiveStatus('live');
    es.onerror = () => setLiveStatus('error');

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_assignments' && Array.isArray(msg.data)) {
          const incoming = msg.data as LeadAssignment[];
          const genuinelyNew = incoming.filter((a) => !lastSeenRef.current.has(a.id));

          if (genuinelyNew.length > 0) {
            genuinelyNew.forEach((a) => lastSeenRef.current.add(a.id));
            setAssignments((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const toAdd = genuinelyNew.filter((a) => !existingIds.has(a.id));
              return [...toAdd, ...prev];
            });
            setNewCount((c) => c + genuinelyNew.length);

            // Refresh provider quota
            supabase
              .from('agents')
              .select('monthly_quota_used, monthly_quota_limit')
              .eq('id', providerId)
              .single()
              .then(({ data }) => {
                if (data) {
                  setProvider((p) => p ? { ...p, ...data } : p);
                }
              });
          }
          setLiveStatus('live');
        }
      } catch (_) {}
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const dismissNew = () => setNewCount(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const quotaRemaining = provider
    ? (provider.monthly_quota_limit ?? 10) - (provider.monthly_quota_used ?? 0)
    : 0;

  const quotaPct = provider
    ? Math.round(((provider.monthly_quota_used ?? 0) / (provider.monthly_quota_limit ?? 10)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* TOPBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-slate-900">
              Lead<span className="text-violet-600">Hub</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500">Provider Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  liveStatus === 'live' ? 'bg-emerald-500 animate-pulse' :
                  liveStatus === 'error' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-500">
                {liveStatus === 'live' ? 'Live' : liveStatus === 'error' ? 'Disconnected' : 'Connecting'}
              </span>
            </div>

            {newCount > 0 && (
              <button
                onClick={dismissNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-full hover:bg-violet-700 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                {newCount} new lead{newCount > 1 ? 's' : ''}
              </button>
            )}

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{provider?.name}</p>
              <p className="text-xs text-slate-400">{provider?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Quota remaining */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quota Left</span>
              <Zap className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{quotaRemaining}</div>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${quotaPct > 80 ? 'bg-red-500' : quotaPct > 50 ? 'bg-amber-500' : 'bg-violet-500'}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{quotaPct}% used this month</p>
          </div>

          {/* Leads received */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leads Received</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{provider?.monthly_quota_used ?? 0}</div>
            <p className="text-xs text-slate-400 mt-1">this month</p>
          </div>

          {/* Total assigned */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Assigned</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{assignments.length}</div>
            <p className="text-xs text-slate-400 mt-1">all time</p>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
              <Circle className={`w-4 h-4 ${provider?.is_available ? 'text-emerald-500' : 'text-slate-400'}`} />
            </div>
            <div className={`text-lg font-bold ${provider?.is_available ? 'text-emerald-600' : 'text-slate-500'}`}>
              {provider?.is_available ? 'Available' : 'Unavailable'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {provider?.status ?? 'offline'}
            </p>
          </div>
        </div>

        {/* LEADS TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Assigned Leads</h2>
            <span className="text-xs text-slate-400">{assignments.length} total</span>
          </div>

          {assignments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No leads assigned yet</p>
              <p className="text-xs mt-1">New leads will appear here automatically</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignments.map((a) => {
                const lead = a.leads;
                if (!lead) return null;
                return (
                  <div
                    key={a.id}
                    className="px-6 py-4 hover:bg-slate-50/60 transition-colors grid md:grid-cols-5 gap-4 items-start"
                  >
                    {/* Customer */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800 text-sm">{lead.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${lead.customer_phone}`} className="hover:text-violet-600 transition-colors">
                          {lead.customer_phone}
                        </a>
                      </div>
                      {lead.customer_email && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{lead.customer_email}</p>
                      )}
                    </div>

                    {/* Service + City */}
                    <div>
                      <div className="text-sm font-medium text-slate-700 mb-1">
                        {SERVICE_LABELS[lead.source] || lead.source}
                      </div>
                      {lead.city && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          {lead.city}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500 line-clamp-2">{lead.notes || '—'}</p>
                    </div>

                    {/* Meta */}
                    <div className="text-right flex flex-col items-end gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[lead.priority] ?? PRIORITY_COLORS[0]}`}
                      >
                        {PRIORITY_LABELS[lead.priority] ?? 'Low'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(a.assigned_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}