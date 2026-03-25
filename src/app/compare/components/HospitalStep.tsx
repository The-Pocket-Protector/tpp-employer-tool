import { useState, useEffect, useRef } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { searchHospitals } from '../lib/compare-api';
import type { HospitalSearchResult } from '@/services/compare.service';
import StepWrapper from './ui/StepWrapper';

export default function HospitalStep() {
  const { zip, hospitals, addHospital, removeHospital } = useCompareStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results, isLoading, query, setQuery, clear } =
    useAutocomplete<HospitalSearchResult>({
      searchFn: (q) => searchHospitals(q, zip),
    });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out already-selected hospitals
  const filtered = results.filter(
    (h) => !hospitals.some((sel) => sel.ccn === h.ccn),
  );

  function handleSelect(h: HospitalSearchResult) {
    addHospital({ ccn: h.ccn, name: h.name, city: h.city, state: h.state });
    clear();
    setShowDropdown(false);
  }

  return (
    <StepWrapper
      label="Hospitals"
      title="Which hospital(s) do you prefer?"
      subtitle="We'll check which plans include your preferred hospitals."
    >
      <div className="flex flex-col gap-4">
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            placeholder={isLoading ? 'Searching hospitals...' : 'Search hospitals near you...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
          />

          {showDropdown && !isLoading && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-[240px] w-full overflow-y-auto rounded-[10px] border border-border bg-white shadow-lg">
              {filtered.map((h) => (
                <button
                  key={h.ccn}
                  type="button"
                  onClick={() => handleSelect(h)}
                  className="flex w-full cursor-pointer items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-light-bg"
                >
                  <span className="mt-0.5 shrink-0 text-base">{'\u{1F3E5}'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-sm font-semibold text-text-dark">
                      {h.name}
                    </div>
                    <div className="font-body text-xs text-text-muted">
                      {[h.city, h.state].filter(Boolean).join(', ')}
                      {h.rating != null && ` · ${h.rating}★`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && !isLoading && query.trim().length >= 2 && filtered.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-[10px] border border-border bg-white px-4 py-3 text-center font-body text-sm text-text-muted shadow-lg">
              No hospitals found matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {hospitals.map((h, i) => (
          <div
            key={h.ccn ?? i}
            className="flex items-center justify-between rounded-[10px] bg-light-bg px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span>{'\u{1F3E5}'}</span>
              <div>
                <span className="font-body text-sm font-semibold text-text-dark">{h.name}</span>
                {(h.city || h.state) && (
                  <div className="font-body text-xs text-text-muted">
                    {[h.city, h.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeHospital(h.ccn)}
              className="cursor-pointer border-none bg-transparent p-1.5 text-lg leading-none text-red-700"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </StepWrapper>
  );
}
