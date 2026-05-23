'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SignUpSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          router.push('/auth/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h1>
        <p className="text-slate-600 mb-6">
          Please check your email to verify your account before signing in.
        </p>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <p className="text-sm text-blue-700">
            Redirecting to login in <span className="font-bold">{countdown}</span> seconds...
          </p>
        </div>

        <Button onClick={() => router.push('/auth/login')} className="w-full">
          Go to Login
        </Button>
      </Card>
    </div>
  );
}
