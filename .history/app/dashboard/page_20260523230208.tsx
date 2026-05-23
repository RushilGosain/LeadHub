'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Clock, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  source: string;
  status: string;
  priority: number;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  notes: string;
  created_at: string;
}

export default function ProviderDashboard() {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({
    myLeads: 0,
    newLeads: 0,
    completedLeads: 0,
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newLeadAlert, setNewLeadAlert] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  let channel: RealtimeChannel;

  // Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  // Fetch initial leads
  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);

      // Calculate stats
      const myLeads = (data || []).filter((l) => l.assigned_agent_id === user?.id);
      const newLeads = (data || []).filter((l) => l.status === 'pending');
      const completed = (data || []).filter((l) => l.status === 'completed');

      setStats({
        myLeads: myLeads.length,
        newLeads: newLeads.length,
        completedLeads: completed.length,
      });
    } catch (err) {
      console.error('[v0] Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [fetchLeads, user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    // Subscribe to new leads
    channel = supabase
      .channel('public:leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('[v0] New lead received:', payload);
          const newLead = payload.new as Lead;
          setLeads((prev) => [newLead, ...prev]);
          setStats((prev) => ({
            ...prev,
            newLeads: prev.newLeads + 1,
          }));
          // Show alert
          setNewLeadAlert(true);
          setTimeout(() => setNewLeadAlert(false), 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('[v0] Lead updated:', payload);
          const updatedLead = payload.new as Lead;
          setLeads((prev) =>
            prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  const getServiceBadgeColor = (service: string) => {
    const colors: Record<string, string> = {
      plumbing: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
      electrical: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
      carpentry: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300',
      painting: 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300',
      hvac: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300',
      cleaning: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
      landscaping: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300',
    };
    return colors[service] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
      assigned: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
      completed: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
    };
    return variants[status] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
  };

  // Accept a lead (assign to current user)
  const handleAcceptLead = async (leadId: string) => {
    if (!user?.id) {
      console.error('[v0] User not authenticated');
      return;
    }

    try {
      setActionLoading(leadId);
      console.log('Accepting lead:', leadId);

      const { error } = await supabase
        .from('leads')
        .update({
          assigned_agent_id: user.id,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      console.log('Lead accepted successfully');

      // Update local state
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                assigned_agent_id: user.id,
                status: 'assigned',
                assigned_at: new Date().toISOString(),
              }
            : lead
        )
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        myLeads: prev.myLeads + 1,
        newLeads: Math.max(0, prev.newLeads - 1),
      }));
    } catch (err) {
      console.error('Failed to accept lead:', err);
      alert('Failed to accept lead. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Mark lead as completed
  const handleMarkComplete = async (leadId: string) => {
    try {
      setActionLoading(leadId);
      console.log('Marking lead as completed:', leadId);

      const { error } = await supabase
        .from('leads')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      console.log('Lead marked as completed');

      // Update local state
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                status: 'completed',
                completed_at: new Date().toISOString(),
              }
            : lead
        )
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        myLeads: Math.max(0, prev.myLeads - 1),
        completedLeads: prev.completedLeads + 1,
      }));
    } catch (err) {
      console.error('[v0] Failed to mark lead as completed:', err);
      alert('Failed to mark lead as completed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Alert for New Leads */}
      {newLeadAlert && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right-4">
          <Card className="bg-primary text-primary-foreground shadow-lg border-0">
            <div className="flex items-center gap-3 p-4">
              <Bell className="w-5 h-5 animate-bounce" />
              <div>
                <p className="font-semibold">New Lead Available!</p>
                <p className="text-sm opacity-90">Scroll down to see the latest service request</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Welcome Header */}
      <div className="border-b border-border/20 pb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome Back, Service Provider!
        </h1>
        <p className="text-foreground/60">
          View real-time service leads assigned to you and manage your pipeline
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* My Assigned Leads */}
        <Card className="p-6 border-l-4 border-l-primary bg-gradient-to-br from-card to-card/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/60">My Assigned Leads</p>
              <p className="text-4xl font-bold text-primary mt-2">{stats.myLeads}</p>
              <p className="text-xs text-foreground/50 mt-2">Leads distributed to you</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-primary/30" />
          </div>
        </Card>

        {/* New Available Leads */}
        <Card className="p-6 border-l-4 border-l-accent bg-gradient-to-br from-card to-card/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/60">New Leads Available</p>
              <p className="text-4xl font-bold text-accent mt-2">{stats.newLeads}</p>
              <p className="text-xs text-foreground/50 mt-2">Waiting to be assigned</p>
            </div>
            <AlertCircle className="w-8 h-8 text-accent/30" />
          </div>
        </Card>

        {/* Completed */}
        <Card className="p-6 border-l-4 border-l-green-500 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/60">Completed This Month</p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">
                {stats.completedLeads}
              </p>
              <p className="text-xs text-foreground/50 mt-2">Successfully completed</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500/30" />
          </div>
        </Card>
      </div>

      {/* Leads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Service Leads</h2>
          <Button
            variant="outline"
            onClick={fetchLeads}
            disabled={loading || actionLoading !== null}
            className="text-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-foreground/60">Loading leads...</p>
          </Card>
        ) : leads.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-foreground/60">No leads available at the moment</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className={`p-6 border transition-all hover:shadow-md ${
                  lead.assigned_agent_id === user?.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Lead Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">
                        {lead.customer_name}
                      </h3>
                      <div className="flex gap-2">
                        <Badge className={getServiceBadgeColor(lead.source)}>
                          {lead.source}
                        </Badge>
                        <Badge className={getStatusBadge(lead.status)}>
                          {lead.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-foreground/70">{lead.notes}</p>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      {/* Phone */}
                      <div className="flex items-center gap-2 text-sm text-foreground/60">
                        <Phone className="w-4 h-4 text-primary" />
                        <a
                          href={`tel:${lead.customer_phone}`}
                          className="hover:text-primary transition-colors"
                        >
                          {lead.customer_phone}
                        </a>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2 text-sm text-foreground/60">
                        <Mail className="w-4 h-4 text-primary" />
                        <a
                          href={`mailto:${lead.customer_email}`}
                          className="hover:text-primary transition-colors"
                        >
                          {lead.customer_email}
                        </a>
                      </div>

                      {/* Created Time */}
                      <div className="flex items-center gap-2 text-sm text-foreground/60">
                        <Clock className="w-4 h-4 text-primary" />
                        {new Date(lead.created_at).toLocaleDateString()} at{' '}
                        {new Date(lead.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      {/* Priority */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-foreground/60">Priority:</span>
                        <span className="font-semibold text-primary">
                          {lead.priority === 1 ? 'High' : lead.priority === 2 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 md:flex-col md:min-w-fit">
                    {lead.assigned_agent_id === user?.id && lead.status !== 'completed' && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={actionLoading === lead.id}
                        onClick={() => handleMarkComplete(lead.id)}
                      >
                        {actionLoading === lead.id ? 'Completing...' : 'Mark Complete'}
                      </Button>
                    )}
                    {lead.status === 'pending' && (
                      <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={actionLoading === lead.id}
                        onClick={() => handleAcceptLead(lead.id)}
                      >
                        {actionLoading === lead.id ? 'Accepting...' : 'Accept Lead'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={actionLoading === lead.id}
                      onClick={() => {
                        window.location.href = `tel:${lead.customer_phone}`;
                      }}
                    >
                      Call Now
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Email icon helper
function Mail(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
