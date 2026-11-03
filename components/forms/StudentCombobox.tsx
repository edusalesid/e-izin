'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Student, Permission } from '@/lib/types';
import { Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentComboboxProps {
  students: Student[];
  permissions?: Permission[];
  selectedStudent: Student | null;
  onSelect: (student: Student) => void;
  disabled?: boolean;
  id?: string;
}

export function StudentCombobox({
  students,
  permissions = [],
  selectedStudent,
  onSelect,
  disabled = false,
  id: propId,
}: StudentComboboxProps) {
  const generatedId = useId();
  const inputId = propId || `student-input-${generatedId}`;
  const listboxId = `student-listbox-${generatedId}`;

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (selectedStudent) {
      setQuery(`${selectedStudent.fullName} (${selectedStudent.className})`);
    } else {
      setQuery('');
    }
  }, [selectedStudent]);

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

  // Santri yang pulang / sudah di approve (APPROVED_WALI_KELAS atau SEDANG_DI_LUAR) tidak muncul di daftar pengajuan
  const availableStudents = useMemo(() => {
    if (!permissions || permissions.length === 0) return students;
    return students.filter((s) => {
      const activePerm = permissions.find(
        (p) =>
          (p.studentId === s.id || (s.nis && p.studentNis === s.nis)) &&
          (p.status === 'APPROVED_WALI_KELAS' || p.status === 'SEDANG_DI_LUAR')
      );
      return !activePerm;
    });
  }, [students, permissions]);

  const filtered = useMemo(() => {
    return availableStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(query.toLowerCase()) ||
        s.nis.includes(query) ||
        s.className.toLowerCase().includes(query.toLowerCase())
    );
  }, [availableStudents, query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filtered.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        const chosen = filtered[highlightedIndex];
        onSelect(chosen);
        setQuery(`${chosen.fullName} (${chosen.className})`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <Search
          aria-hidden="true"
          className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none"
        />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari nama santri, NIS, atau kelas..."
          className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-11 py-2.5 text-base sm:text-xs font-medium text-zinc-900 placeholder-zinc-500 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:bg-zinc-100 disabled:text-zinc-500 min-h-[44px]"
        />
        {query && !disabled && (
          <button
            type="button"
            aria-label="Hapus pilihan santri"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            className="absolute right-1.5 h-9 w-9 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Daftar Pilihan Santri"
          ref={listboxRef}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg divide-y divide-zinc-100"
        >
          {filtered.length === 0 ? (
            <li
              role="status"
              className="py-4 px-3 text-center text-xs font-medium text-zinc-500"
            >
              Tidak ada santri yang cocok dengan pencarian
            </li>
          ) : (
            filtered.map((s, index) => {
              const isSelected = selectedStudent?.id === s.id;
              const isHighlighted = highlightedIndex === index;
              const isPending = permissions.some(
                (p) =>
                  (p.studentId === s.id || (s.nis && p.studentNis === s.nis)) &&
                  p.status === 'PENDING_WALI_KELAS'
              );

              return (
                <li
                  key={s.id}
                  id={`student-option-${s.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(s);
                    setQuery(`${s.fullName} (${s.className})`);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition cursor-pointer min-h-[44px]',
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 font-bold'
                      : isHighlighted
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-800 hover:bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      aria-hidden="true"
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                        isPending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {s.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs truncate font-bold text-zinc-900">{s.fullName}</p>
                        {isPending && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md">
                            Dalam Tinjauan
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-600 truncate">
                        NIS: <span className="font-semibold">{s.nis}</span> &bull; {s.className}
                      </p>
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
            })
          )}
        </ul>
      )}
    </div>
  );
}
