import { useState, useRef, useEffect } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { searchDrugs } from '../lib/compare-api';
import type { Drug } from '@/types/compare';
import StepWrapper from './ui/StepWrapper';

function DrugAutocomplete({
  index,
  initialName,
  onSelect,
  onNameChange,
}: {
  index: number;
  initialName: string;
  onSelect: (index: number, drug: Drug) => void;
  onNameChange: (index: number, name: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [localName, setLocalName] = useState(initialName);

  const { results, isLoading, query, setQuery, clear } =
    useAutocomplete<Drug>({
      searchFn: (q) => searchDrugs(q),
    });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(d: Drug) {
    setLocalName(d.drug_name);
    onSelect(index, d);
    clear();
    setShowDropdown(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        placeholder="Drug name (e.g. Eliquis)"
        value={query || localName}
        onChange={(e) => {
          const v = e.target.value;
          setLocalName(v);
          setQuery(v);
          setShowDropdown(true);
        }}
        onBlur={() => {
          // Sync typed text to parent on blur (delay to allow click to register)
          const name = query || localName;
          setTimeout(() => onNameChange(index, name), 150);
        }}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
        className="w-full rounded-[10px] border-[1.5px] border-border bg-white px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-[10px] border border-border bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={r.rxcui}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(r)}
              className="flex w-full cursor-pointer flex-col gap-0.5 border-b border-border/50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-light-bg"
            >
              <span className="font-body text-sm font-semibold text-text-dark">
                {r.drug_name}
              </span>
              {(r.form || r.strength) && (
                <span className="font-body text-xs text-text-muted">
                  {[r.form, r.strength].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DrugStep() {
  const { drugs, setField, flow } = useCompareStore();
  const isPdp = flow === 'pdp';

  function addDrug() {
    setField('drugs', [
      ...drugs,
      { rxcui: `drug-${Date.now()}`, drug_name: '', form: '', strength: '' },
    ]);
  }

  function updateDrugField(index: number, key: string, value: string) {
    const updated = [...drugs];
    updated[index] = { ...updated[index], [key]: value };
    setField('drugs', updated);
  }

  function selectDrug(index: number, selected: Drug) {
    const updated = [...drugs];
    updated[index] = {
      ...updated[index],
      drug_name: selected.drug_name,
      rxcui: selected.rxcui,
      form: selected.form ?? updated[index].form,
      strength: selected.strength ?? updated[index].strength,
    };
    setField('drugs', updated);
  }

  function removeDrug(index: number) {
    setField(
      'drugs',
      drugs.filter((_, i) => i !== index),
    );
  }

  return (
    <StepWrapper
      label="Prescriptions"
      title="What medications do you take?"
      subtitle={
        isPdp
          ? "We'll compare drug costs across Part D plans."
          : "We'll compare drug costs across plans."
      }
    >
      <div className="mb-4 flex flex-col gap-3">
        {drugs.map((d, i) => (
          <div
            key={d.rxcui ?? i}
            className="flex flex-col gap-2.5 rounded-xl bg-[#f8f9fa] p-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-[11px] font-bold uppercase tracking-[0.06em] text-primary">
                DRUG {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeDrug(i)}
                className="cursor-pointer border-none bg-transparent p-1.5 text-lg leading-none text-red-700"
              >
                &times;
              </button>
            </div>
            <DrugAutocomplete
              index={i}
              initialName={d.drug_name}
              onSelect={selectDrug}
              onNameChange={(idx, name) => updateDrugField(idx, 'drug_name', name)}
            />
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="Dosage (e.g. 5mg)"
                value={d.strength ?? ''}
                onChange={(e) => updateDrugField(i, 'strength', e.target.value)}
                className="flex-1 rounded-[10px] border-[1.5px] border-border bg-white px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
              />
              <select
                value={d.form || 'Once daily'}
                onChange={(e) => updateDrugField(i, 'form', e.target.value)}
                className="flex-1 appearance-auto rounded-[10px] border-[1.5px] border-border bg-white px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
              >
                <option>Once daily</option>
                <option>Twice daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>As needed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addDrug}
        className="w-full cursor-pointer rounded-xl border-2 border-dashed border-border bg-transparent p-3 font-body text-sm font-semibold text-primary transition-colors hover:border-primary"
      >
        + Add a medication
      </button>
    </StepWrapper>
  );
}
