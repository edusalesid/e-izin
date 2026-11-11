'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RefreshVerificationButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="cursor-pointer gap-1.5"
    >
      <RefreshCw className={cn('w-3.5 h-3.5', isPending && 'animate-spin')} />
      <span>{isPending ? 'Memuat...' : 'Perbarui Status'}</span>
    </Button>
  );
}
