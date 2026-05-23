'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Page() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/enquiry');
      }
    };

    checkAuth();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-foreground text-lg">Loading...</p>
      </div>
    </div>
  );
}
