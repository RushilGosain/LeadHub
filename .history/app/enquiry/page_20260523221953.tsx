'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Phone, User, MapPin, Wrench, FileText } from 'lucide-react';

const SERVICE_CATEGORIES = [
  { value: 'plumbing',     label: 'Plumbing',     icon: '🔧' },
  { value: 'electrical',  label: 'Electrical',   icon: '⚡' },
  { value: 'carpentry',   label: 'Carpentry',    icon: '🪚' },
  { value: 'painting',    label: 'Painting',     icon: '🎨' },
  { value: 'hvac',        label: 'HVAC',         icon: '❄️' },
  { value: 'cleaning',    label: 'Cleaning',     icon: '🧹' },
  { value: 'landscaping', label: 'Landscaping',  icon: '🌿' },
  { value: 'other',       label: 'Other',        icon: '🔨' },
];

type Status = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

interface FormData {
  name: string;
  phone: string;
  city: string;
  service: string;
  description: string;
}

export default function RequestServicePage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    city: '',
    service: '',
    description: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'DUPLICATE_LEAD') {
          setStatus('duplicate');
          setErrorMessage(data.error);
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setStatus('success');
      setForm({ name: '', phone: '', city: '', service: '', description: '' });
    } catch (err) {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection.');
    }
  };

  const inputBase =
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-800 text-sm placeholder-slate-400 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  return (
    <div className="min-h-screen bg-[#f5f4f0]" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* NAV */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight text-slate-900">
            Lead<span className="text-violet-600">Hub</span>
          </span>
          <a
            href="/auth/login"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            Provider Sign In <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* HERO */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold uppercase tracking-widest mb-4">
            Instant Matching
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Get the right professional,
            <br />
            <span className="text-violet-600 italic">right away.</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Submit your service request and we'll connect you with verified, local
            professionals within minutes.
          </p>
        </div>

        {/* FEATURE STRIPS */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { icon: '⚡', title: 'Instant', desc: 'Auto-matched in seconds' },
            { icon: '✓',  title: 'Vetted',  desc: 'All providers verified'   },
            { icon: '🔒', title: 'Private', desc: 'Your data stays safe'     },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-5 border border-slate-100 text-center shadow-sm">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-slate-800 text-sm">{f.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* FORM CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-xl font-bold text-slate-900">Submit a Service Request</h2>
            <p className="text-sm text-slate-500 mt-1">
              Fill in the details below — all fields marked * are required.
            </p>
          </div>

          <div className="px-8 py-8">
            {/* STATUS BANNERS */}
            {status === 'success' && (
              <div className="mb-6 flex gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold">Request submitted!</p>
                  <p className="text-sm mt-0.5">Providers have been notified and will reach out shortly.</p>
                </div>
              </div>
            )}

            {status === 'duplicate' && (
              <div className="mb-6 flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">Duplicate request</p>
                  <p className="text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="mb-6 flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold">Submission failed</p>
                  <p className="text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    <User className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Rajesh Kumar"
                    required
                    className={inputBase}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="9999999999"
                    required
                    className={inputBase}
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    City *
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="Mumbai"
                    required
                    className={inputBase}
                  />
                </div>

                {/* Service */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    <Wrench className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Service Type *
                  </label>
                  <select
                    value={form.service}
                    onChange={set('service')}
                    required
                    className={inputBase}
                  >
                    <option value="" disabled>Select a service…</option>
                    {SERVICE_CATEGORIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  <FileText className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                  Describe your requirement *
                </label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  placeholder="E.g. Kitchen tap is leaking badly, needs urgent repair…"
                  required
                  rows={4}
                  className={`${inputBase} resize-none`}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Be specific — providers who see detailed requests respond faster.
                </p>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm transition-all active:scale-[0.99]"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Connect Me with Providers
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-slate-400">
                By submitting, you agree that providers may contact you on the number provided.
                We never sell your information.
              </p>
            </form>
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        © 2026 LeadHub · Connecting customers with trusted service professionals
      </footer>
    </div>
  );
}