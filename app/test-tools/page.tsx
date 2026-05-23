'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  RefreshCw, Zap, FlaskConical, Play, CheckCircle2,
  AlertTriangle, Loader2, Shield, ArrowLeft,
} from 'lucide-react';

interface LogEntry {
  id: number;
  ts: string;
  level: 'info' | 'success' | 'error' | 'warn';
  msg: string;
}

const SAMPLE_NAMES  = ['Amit Shah', 'Priya Nair', 'Ravi Verma', 'Sunita Rao', 'Deepak Joshi', 'Kavya Reddy', 'Mohan Das', 'Anita Singh', 'Suresh Patel', 'Meena Gupta'];
const SAMPLE_PHONES = ['9000000001','9000000002','9000000003','9000000004','9000000005','9000000006','9000000007','9000000008','9000000009','9000000010'];
const SERVICES      = ['plumbing','electrical','carpentry','painting','hvac','cleaning','landscaping'];
const CITIES        = ['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Pune','Ahmedabad'];

let logId = 0;

export default function TestToolsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const log = (level: LogEntry['level'], msg: string) => {
    const entry: LogEntry = {
      id: ++logId,
      ts: new Date().toLocaleTimeString(),
      level,
      msg,
    };
    setLogs((l) => [entry, ...l.slice(0, 99)]);
  };

  const setBusyKey = (key: string, val: boolean) =>
    setBusy((b) => ({ ...b, [key]: val }));

  // ─── Tool 1: Reset all quotas via webhook ─────────────────────────
  const resetQuotas = async (callCount = 1) => {
    const key = 'reset';
    setBusyKey(key, true);
    // Use a fixed event_id for idempotency testing when called multiple times
    const eventId = `test-reset-${new Date().toISOString().slice(0, 10)}`;

    log('info', `Calling webhook ${callCount}x with event_id="${eventId}"…`);

    for (let i = 0; i < callCount; i++) {
      try {
        const res = await fetch('/api/webhook/reset-quota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: eventId, triggered_from: 'test-tools' }),
        });
        const data = await res.json();

        if (data.idempotent) {
          log('warn', `Call #${i + 1}: IDEMPOTENT — already processed. No changes made. ✓`);
        } else if (data.success) {
          log('success', `Call #${i + 1}: Quotas reset to 10 for all providers ✓`);
        } else {
          log('error', `Call #${i + 1}: ${data.error}`);
        }
      } catch (e: any) {
        log('error', `Call #${i + 1}: Network error — ${e.message}`);
      }
    }
    setBusyKey(key, false);
  };

  // ─── Tool 2: Call webhook multiple times (idempotency test) ───────
  const testIdempotency = async () => {
    log('info', '--- Idempotency test: calling webhook 5x with same event_id ---');
    await resetQuotas(5);
    log('info', '--- Idempotency test complete. Only first call should have changed data. ---');
  };

  // ─── Tool 3: Generate 10 leads concurrently ───────────────────────
  const generateLeads = async () => {
    const key = 'generate';
    setBusyKey(key, true);
    log('info', '--- Generating 10 leads concurrently ---');

    const promises = Array.from({ length: 10 }, (_, i) => {
      const name    = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
      const phone   = `90${Date.now()}${i}`.slice(0, 10);
      const service = SERVICES[i % SERVICES.length];
      const city    = CITIES[i % CITIES.length];

      return fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          city,
          service,
          description: `Test lead #${i + 1} — ${service} in ${city}`,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            log('success', `Lead ${i + 1}: ${name} (${service}) → assigned ${d.assignedProviders} providers`);
          } else {
            log('error', `Lead ${i + 1}: ${d.error}`);
          }
        })
        .catch((e) => log('error', `Lead ${i + 1}: ${e.message}`));
    });

    await Promise.all(promises);
    log('info', '--- Concurrent generation complete ---');
    setBusyKey(key, false);
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* HEADER */}
      <header className="border-b border-zinc-800 px-6 h-14 flex items-center justify-between sticky top-0 z-20 bg-zinc-950/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-zinc-100">Test Tools</span>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            DEV ONLY
          </span>
        </div>
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-[360px_1fr] gap-8">
        {/* TOOLS PANEL */}
        <div className="space-y-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Available Tools</div>

          {/* Warning banner */}
          <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>These tools exist for QA/testing only. Quota resets must only flow through the webhook endpoint.</span>
          </div>

          {/* Tool 1 */}
          <ToolCard
            icon={<RefreshCw className="w-5 h-5 text-emerald-400" />}
            title="Reset Provider Quotas"
            description="Simulates a payment gateway confirming subscription renewal. Resets all providers to 10 leads/month."
            tag="webhook"
            tagColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
            busy={busy['reset']}
            onClick={() => resetQuotas(1)}
          />

          {/* Tool 2 */}
          <ToolCard
            icon={<Zap className="w-5 h-5 text-blue-400" />}
            title="Test Webhook Idempotency"
            description="Calls the reset webhook 5× with the same event_id. Only the first call should take effect."
            tag="idempotency"
            tagColor="text-blue-400 bg-blue-500/10 border-blue-500/30"
            busy={busy['reset']}
            onClick={testIdempotency}
          />

          {/* Tool 3 */}
          <ToolCard
            icon={<Play className="w-5 h-5 text-violet-400" />}
            title="Generate 10 Leads Concurrently"
            description="Fires 10 lead submissions simultaneously to test concurrency, distribution fairness, and quota enforcement."
            tag="concurrency"
            tagColor="text-violet-400 bg-violet-500/10 border-violet-500/30"
            busy={busy['generate']}
            onClick={generateLeads}
          />

          <button
            onClick={clearLogs}
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2"
          >
            Clear log
          </button>
        </div>

        {/* LOG PANEL */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Output Log</span>
            <span className="text-xs text-zinc-600">{logs.length} entries</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[400px] max-h-[600px]">
            {logs.length === 0 && (
              <p className="text-xs text-zinc-600 italic">Run a tool to see output here…</p>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex gap-2 text-xs leading-relaxed">
                <span className="text-zinc-600 flex-shrink-0">{l.ts}</span>
                <span
                  className={
                    l.level === 'success' ? 'text-emerald-400' :
                    l.level === 'error'   ? 'text-red-400' :
                    l.level === 'warn'    ? 'text-amber-400' :
                    'text-zinc-400'
                  }
                >
                  {l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '⚠' : '›'}
                </span>
                <span className={
                  l.level === 'success' ? 'text-emerald-300' :
                  l.level === 'error'   ? 'text-red-300' :
                  l.level === 'warn'    ? 'text-amber-300' :
                  'text-zinc-300'
                }>
                  {l.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────
function ToolCard({
  icon, title, description, tag, tagColor, busy, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-100 text-sm">{title}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${tagColor}`}>{tag}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700"
      >
        {busy ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            Run
          </>
        )}
      </button>
    </div>
  );
}