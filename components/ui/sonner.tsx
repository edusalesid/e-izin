'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans text-xs',
          description: 'group-[.toast]:text-zinc-500 text-xs',
          actionButton:
            'group-[.toast]:bg-emerald-700 group-[.toast]:text-white text-xs',
          cancelButton:
            'group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-600 text-xs',
          success: 'group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50/95 group-[.toaster]:text-emerald-950',
          error: 'group-[.toaster]:border-rose-200 group-[.toaster]:bg-rose-50/95 group-[.toaster]:text-rose-950',
          warning: 'group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50/95 group-[.toaster]:text-amber-950',
          info: 'group-[.toaster]:border-sky-200 group-[.toaster]:bg-sky-50/95 group-[.toaster]:text-sky-950',
        },
      }}
      {...props}
    />
  );
}
