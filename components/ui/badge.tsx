import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 select-none border',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-emerald-700 text-white',
        secondary:
          'border-zinc-200 bg-zinc-100 text-zinc-800',
        destructive:
          'border-rose-200 bg-rose-50 text-rose-700',
        outline:
          'border-zinc-300 text-zinc-800 bg-transparent',
        pending:
          'border-amber-200 bg-amber-50 text-amber-800',
        approved:
          'border-emerald-200 bg-emerald-50 text-emerald-800',
        rejected:
          'border-rose-200 bg-rose-50 text-rose-800',
        active:
          'border-blue-200 bg-blue-50 text-blue-800',
        completed:
          'border-zinc-300 bg-zinc-100 text-zinc-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
