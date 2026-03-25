import { useCompareStore } from '@/stores/compare.store';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { searchProviders } from '../lib/compare-api';
import type { Provider } from '@/types/compare';
import StepWrapper from './ui/StepWrapper';

export default function DoctorStep() {
  const { doctors, zip, addDoctor, removeDoctor } = useCompareStore();

  const { results, isLoading, query, setQuery, clear } =
    useAutocomplete<Provider>({
      searchFn: (q) => searchProviders(q, zip),
    });

  function handleAdd(name: string) {
    if (!name.trim() || doctors.some((d) => d.name === name.trim())) return;
    addDoctor({ npi: `manual-${Date.now()}`, name: name.trim() });
    clear();
  }

  return (
    <StepWrapper
      label="Providers"
      title="Who are your doctors?"
      subtitle="Adding doctors helps find in-network plans. You can skip this."
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2.5">
          <input
            type="text"
            placeholder="Search by name or NPI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (results.length > 0) {
                  addDoctor(results[0]);
                  clear();
                } else if (query.trim()) {
                  handleAdd(query);
                }
              }
            }}
            className="flex-1 rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
          />
          <button
            type="button"
            onClick={() => {
              if (results.length > 0) {
                addDoctor(results[0]);
                clear();
              } else {
                handleAdd(query);
              }
            }}
            disabled={isLoading}
            className="shrink-0 cursor-pointer whitespace-nowrap rounded-[10px] bg-primary px-[18px] py-3 font-body text-[13px] font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : '+ Add'}
          </button>
        </div>

        {doctors.map((d, i) => (
          <div
            key={d.npi ?? i}
            className="flex items-center justify-between rounded-[10px] bg-light-bg px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span>{'\u{1F468}\u200D\u2695\uFE0F'}</span>
              <span className="font-body text-sm font-semibold text-text-dark">{d.name}</span>
            </div>
            <button
              type="button"
              onClick={() => removeDoctor(d.npi)}
              className="cursor-pointer border-none bg-transparent p-1.5 text-lg leading-none text-red-700"
            >
              &times;
            </button>
          </div>
        ))}

        {results.length > 0 && (
          <div className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-[10px] border border-border p-2">
            {results.map((r) => (
              <button
                key={r.npi}
                type="button"
                onClick={() => {
                  addDoctor(r);
                  clear();
                }}
                className="flex flex-col gap-0.5 rounded-lg p-3 text-left transition-colors hover:bg-light-bg cursor-pointer"
              >
                <span className="font-body text-sm font-semibold text-text-dark">{r.name}</span>
                {r.specialty && <span className="font-body text-xs text-text-muted">{r.specialty}</span>}
                {r.address && <span className="font-body text-xs text-text-muted">{r.address}</span>}
              </button>
            ))}
          </div>
        )}

        {doctors.length === 0 && results.length === 0 && (
          <div className="py-7 text-center font-body text-[13px] text-text-muted">
            No doctors added yet
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
