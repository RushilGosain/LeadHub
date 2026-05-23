'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const serviceCategories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'other', label: 'Other' },
];

export default function EnquiryPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    description: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (value: string) => {
    setFormData((prev) => ({ ...prev, service: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.service ||
        !formData.description
      ) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Insert lead into database
      const { error: insertError } = await supabase.from('leads').insert([
        {
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          source: formData.service,
          status: 'pending',
          notes: formData.description,
          priority: 1,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      // Trigger automatic lead distribution
      try {
        const distributionRes = await fetch('/api/leads/auto-distribute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!distributionRes.ok) {
          console.warn('[v0] Lead distribution failed but enquiry was saved');
        } else {
          const distributionData = await distributionRes.json();
          console.log('[v0] Leads distributed:', distributionData);
        }
      } catch (distributionError) {
        console.warn('[v0] Could not trigger distribution:', distributionError);
      }

      // Clear form
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: '',
        description: '',
        address: '',
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: any) {
      console.error('[v0] Enquiry submission error:', err);
      setError(err.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">LeadHub</div>
          <a
            href="/auth/login"
            className="text-sm text-foreground/70 hover:text-foreground transition-colors"
          >
            Service Provider? Sign In
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="border-b border-border/20">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20">
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground text-balance">
              Get Professional Service
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                in Just a Few Minutes
              </span>
            </h1>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto text-pretty">
              Connect with verified service providers. Your enquiry will be instantly
              distributed to the best-matched professionals ready to help.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: '⚡',
                title: 'Instant Matching',
                desc: 'Your enquiry reaches qualified providers instantly',
              },
              {
                icon: '✓',
                title: 'Pre-Vetted',
                desc: 'All providers are verified professionals',
              },
              {
                icon: '🔔',
                title: 'Real-Time Response',
                desc: 'Providers respond quickly to your needs',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex gap-3 text-center flex-col items-center justify-center p-6 rounded-xl bg-card border border-border/50"
              >
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-foreground/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <Card className="border border-border/50 shadow-lg">
          <div className="p-8 md:p-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Submit Your Service Enquiry
            </h2>
            <p className="text-foreground/60 mb-8">
              Tell us what you need and we'll connect you with the right professionals
            </p>

            {submitted && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Enquiry Submitted Successfully!
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Your service enquiry has been received. Service providers will contact
                    you shortly.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-medium">
                    Your Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="bg-input border-border/50 focus-visible:ring-primary"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="bg-input border-border/50 focus-visible:ring-primary"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="bg-input border-border/50 focus-visible:ring-primary"
                  />
                </div>

                {/* Service Category */}
                <div className="space-y-2">
                  <Label htmlFor="service" className="text-foreground font-medium">
                    Service Category *
                  </Label>
                  <Select
                    value={formData.service}
                    onValueChange={handleServiceChange}
                  >
                    <SelectTrigger className="bg-input border-border/50 focus-visible:ring-primary">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground font-medium">
                  Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main St, City, State 12345"
                  value={formData.address}
                  onChange={handleChange}
                  className="bg-input border-border/50 focus-visible:ring-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground font-medium">
                  Service Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Please describe the service you need in detail..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="bg-input border-border/50 focus-visible:ring-primary resize-none"
                />
                <p className="text-xs text-foreground/50">
                  Provide as much detail as possible so providers can better understand your needs
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
              >
                {loading ? 'Submitting...' : 'Get Connected with Service Providers'}
              </Button>

              <p className="text-xs text-foreground/50 text-center">
                We never share your information. Service providers can only contact you if you
                submit an enquiry.
              </p>
            </form>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 mt-16 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-foreground/60 text-sm">
          <p>© 2024 LeadHub. Connecting customers with service providers.</p>
        </div>
      </div>
    </div>
  );
}
