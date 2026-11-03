'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { UserAccount } from '@/lib/types';
import { GraduationCap, ChevronDown, Check, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApproverSelectProps {
  approvers: UserAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  id?: string;
  disabled?: boolean;
}

export function ApproverSelect({
  approvers,
  selectedId,
  onSelect,
  id: propId,
  disabled = false,
}: ApproverSelectProps) {
  const generatedId = useId();
  const selectId = propId || `approver-select-${generatedId}`;
  const listboxId = `approver-listbox-${generatedId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedApprover = approvers.find((u) => u.id === selectedId) || approvers[0];

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < approvers.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(approvers.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : approvers.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < approvers.length) {
        onSelect(approvers[highlightedIndex].id);
        setIsOpen(false);
      } else {
        setIsOpen(!isOpen);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: 'Super Admin',
          className: 'bg-amber-50 text-amber-900 border-amber-200/80',
          icon: ShieldCheck,
        };
      case 'WALI_KELAS':
        return {
          label: 'Wali Kelas',
          className: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
          icon: GraduationCap,
        };
      case 'KEPALA_ASRAMA':
        return {
          label: 'Kepala Asrama',
          className: 'bg-purple-50 text-purple-900 border-purple-200/80',
          icon: ShieldCheck,
        };
      default:
        return {
          label: 'Ustadz Pengasuhan',
          className: 'bg-zinc-100 text-zinc-800 border-zinc-200/80',
          icon: User,
        };
    }
  };

  const selectedBadge = selectedApprover ? getRoleBadge(selectedApprover.role) : null;
  const SelectedIcon = selectedBadge?.icon || GraduationCap;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center justify-between gap-3 rounded-xl border bg-white p-2.5 text-left transition select-none min-h-[52px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1 cursor-pointer',
          isOpen
            ? 'border-emerald-700 ring-2 ring-emerald-700/20'
            : 'border-zinc-300 hover:border-emerald-600',
          disabled && 'bg-zinc-100 opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold"
          >
            <SelectedIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-900 truncate">
              {selectedApprover?.name || 'Pilih Ustadz Tujuan'}
            </p>
            {selectedBadge && (
              <span
                className={cn(
                  'inline-block mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold border',
                  selectedBadge.className
                )}
              >
                {selectedBadge.label}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-emerald-700'
          )}
        />
      </button>

      {/* Accessible Dropdown Listbox */}
      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Pilihan Ustadz Tujuan Persetujuan"
          ref={listboxRef}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg divide-y divide-zinc-100"
        >
          {approvers.map((u, index) => {
            const isSelected = u.id === selectedId;
            const isHighlighted = index === highlightedIndex;
            const badge = getRoleBadge(u.role);
            const RoleIcon = badge.icon;

            return (
              <li
                key={u.id}
                id={`approver-option-${u.id}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(u.id);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg text-left transition cursor-pointer min-h-[48px]',
                  isSelected
                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80'
                    : isHighlighted
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-800 hover:bg-zinc-50'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    aria-hidden="true"
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                      isSelected
                        ? 'bg-emerald-700 text-white'
                        : 'bg-zinc-100 text-zinc-700'
                    )}
                  >
                    <RoleIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 truncate">{u.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.2 text-[10px] font-bold border',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                      {u.phone && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {u.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check
                    aria-hidden="true"
                    className="w-4 h-4 text-emerald-700 shrink-0 ml-2"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
