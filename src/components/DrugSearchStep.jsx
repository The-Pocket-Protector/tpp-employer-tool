/**
 * DrugSearchStep - Form-based drug search with 3-letter prefix autocomplete
 * Searches drugs by name prefix and allows dosage/quantity/frequency selection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchDrugs as searchDrugsApi } from '../services/tpp-api.service';
import {
  GREEN,
  GREEN_LIGHT,
  TEXT_DARK,
  TEXT_MED,
  TEXT_LIGHT,
  BORDER,
  heading,
  body
} from '../constants/styles';


/**
 * @param {Object} props
 * @param {string} props.zipCode - User's ZIP code
 * @param {Array} props.selectedDrugs - Already selected drugs
 * @param {function} props.onComplete - Callback with selected drugs array
 * @param {function} props.onBack - Callback to go back
 */
export default function DrugSearchStep({
  zipCode,
  selectedDrugs = [],
  onComplete,
  onBack
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState([...selectedDrugs]);
  const [error, setError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);

  // Drug configuration state (for when a drug is selected but needs dosage/qty)
  const [pendingDrug, setPendingDrug] = useState(null);
  const [dosages, setDosages] = useState([]);
  const [selectedDosage, setSelectedDosage] = useState(null);
  const [quantity, setQuantity] = useState(30);
  const [frequency, setFrequency] = useState('once_daily');
  const [isLoadingDosages, setIsLoadingDosages] = useState(false);

  // Frequency options for medication
  const FREQUENCY_OPTIONS = [
    { value: 'once_daily', label: 'Once daily', daysSupply: 30 },
    { value: 'twice_daily', label: 'Twice daily', daysSupply: 15 },
    { value: 'three_times_daily', label: 'Three times daily', daysSupply: 10 },
    { value: 'four_times_daily', label: 'Four times daily', daysSupply: 7 },
    { value: 'once_weekly', label: 'Once weekly', daysSupply: 210 },
    { value: 'every_other_day', label: 'Every other day', daysSupply: 60 },
    { value: 'as_needed', label: 'As needed (PRN)', daysSupply: 30 }
  ];

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Search drugs when query changes (debounced, 2+ characters)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setNoResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const result = await searchDrugsApi(searchQuery, 15);
        const drugs = Array.isArray(result) ? result : (result?.drugs || []);

        // Filter out already selected
        const selectedIds = new Set(selected.map(d => d.drugNameId || d.id));
        const filtered = drugs.filter(drug => !selectedIds.has(drug.id));

        setSuggestions(filtered.slice(0, 15));
        setShowSuggestions(filtered.length > 0);
        setNoResults(filtered.length === 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Drug search error:', err);
        setError('Failed to search medications. Please try again.');
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selected]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectDrug(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, highlightedIndex]);

  // Select a drug — tpp-api returns dosages inline, no second call needed
  const handleSelectDrug = (drug) => {
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setSearchQuery('');
    setError(null);

    const dosageList = drug.dosages || [];

    setPendingDrug(drug);
    setDosages(dosageList);

    if (dosageList.length > 0) {
      setSelectedDosage(dosageList[0]);
      setQuantity(dosageList[0].packages?.[0]?.pm || 30);
      setFrequency(dosageList[0].form === 'INJ' ? 'once_weekly' : 'once_daily');
    } else {
      // No dosage info — allow adding with defaults
      setSelectedDosage({ id: drug.id, strength: '', strengthUOM: '', form: '', packages: [] });
      setQuantity(30);
      setFrequency('once_daily');
    }
  };

  // Add the configured drug to the selected list
  const handleAddDrug = () => {
    if (!pendingDrug || !selectedDosage) return;

    const frequencyOption = FREQUENCY_OPTIONS.find(f => f.value === frequency);

    const newDrug = {
      id: selectedDosage.id,
      drugNameId: pendingDrug.id,
      name: pendingDrug.name,
      genericName: pendingDrug.genericName || null,
      strength: selectedDosage.strength || '',
      strengthUOM: selectedDosage.strengthUOM || '',
      form: selectedDosage.form || '',
      qty: quantity,
      frequency: frequencyOption?.daysSupply || 30,
      frequencyLabel: frequencyOption?.label || 'Once daily',
      frequencyValue: frequency,
      ps: selectedDosage.packages?.[0]?.pkgId || 1,
      pm: selectedDosage.packages?.[0]?.pm || 30
    };

    setSelected(prev => [...prev, newDrug]);
    setPendingDrug(null);
    setDosages([]);
    setSelectedDosage(null);
    setQuantity(30);
    setFrequency('once_daily');
    inputRef.current?.focus();
  };

  // Cancel pending drug configuration
  const handleCancelPending = () => {
    setPendingDrug(null);
    setDosages([]);
    setSelectedDosage(null);
    setQuantity(30);
    setFrequency('once_daily');
    inputRef.current?.focus();
  };

  // Remove a selected drug
  const handleRemoveDrug = (drugId) => {
    setSelected(prev => prev.filter(d => d.id !== drugId));
  };

  // Handle continue
  const handleContinue = () => {
    onComplete(selected);
  };

  // Handle skip
  const handleSkip = () => {
    onComplete([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Pending drug configuration */}
      {pendingDrug ? (
        <div style={{
          background: GREEN_LIGHT,
          border: `2px solid ${GREEN}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 20
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: TEXT_DARK,
              fontFamily: heading
            }}>
              {pendingDrug.name}
            </div>
            {pendingDrug.genericName && (
              <div style={{
                fontSize: 13,
                color: TEXT_MED,
                fontFamily: body,
                marginTop: 2
              }}>
                {pendingDrug.genericName}
              </div>
            )}
          </div>

          {/* Dosage selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: TEXT_MED,
              fontFamily: body,
              marginBottom: 6
            }}>
              Dosage / Strength
            </label>
            <select
              value={selectedDosage?.id || ''}
              onChange={(e) => {
                const dosage = dosages.find(d => d.id === parseInt(e.target.value));
                setSelectedDosage(dosage);
                if (dosage?.packages?.[0]?.pm) setQuantity(dosage.packages[0].pm);
                // Default to weekly for injections, daily for other forms
                setFrequency(dosage?.form === 'INJ' ? 'once_weekly' : 'once_daily');
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                fontSize: 14,
                border: `2px solid ${BORDER}`,
                borderRadius: 8,
                fontFamily: body,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              {dosages.map(dosage => (
                <option key={dosage.id} value={dosage.id}>
                  {dosage.strength}{dosage.strengthUOM}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: TEXT_MED,
              fontFamily: body,
              marginBottom: 6
            }}>
              How many per refill?
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setQuantity('');
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num) && num >= 0) {
                    setQuantity(num);
                  }
                }
              }}
              onBlur={() => {
                if (quantity === '' || quantity < 1) {
                  setQuantity(30);
                }
              }}
              min={1}
              max={999}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                fontSize: 14,
                border: `2px solid ${BORDER}`,
                borderRadius: 8,
                fontFamily: body
              }}
            />
          </div>

          {/* Frequency selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: TEXT_MED,
              fontFamily: body,
              marginBottom: 6
            }}>
              How often do you take this?
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                fontSize: 14,
                border: `2px solid ${BORDER}`,
                borderRadius: 8,
                fontFamily: body,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              {FREQUENCY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Add/Cancel buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCancelPending}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#fff',
                border: `2px solid ${BORDER}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: TEXT_MED,
                fontFamily: heading,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddDrug}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: GREEN,
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                fontFamily: heading,
                cursor: 'pointer'
              }}
            >
              Add Medication
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type medication name..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px 16px',
                paddingRight: isSearching ? 40 : 16,
                fontSize: 15,
                border: `2px solid ${showSuggestions ? GREEN : BORDER}`,
                borderRadius: 10,
                outline: 'none',
                fontFamily: body,
                transition: 'border-color 0.15s'
              }}
            />

            {/* Loading spinner */}
            {(isSearching || isLoadingDosages) && (
              <div style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                border: `2px solid ${BORDER}`,
                borderTopColor: GREEN,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}>
                <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: 280,
                  overflowY: 'auto',
                  background: '#fff',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  marginTop: 4
                }}
              >
                {suggestions.map((drug, index) => (
                  <div
                    key={drug.id}
                    onClick={() => handleSelectDrug(drug)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: index < suggestions.length - 1 ? `1px solid ${BORDER}` : 'none',
                      background: highlightedIndex === index ? GREEN_LIGHT : '#fff',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: TEXT_DARK,
                      fontFamily: heading
                    }}>
                      {drug.name}
                    </div>
                    {drug.genericName && (
                      <div style={{
                        fontSize: 12,
                        color: TEXT_MED,
                        fontFamily: body,
                        marginTop: 2
                      }}>
                        {drug.genericName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {noResults && !isSearching && searchQuery.length >= 2 && (
              <div style={{
                fontSize: 13,
                color: TEXT_LIGHT,
                fontFamily: body,
                marginTop: 8
              }}>
                No results found for "{searchQuery}"
              </div>
            )}
          </div>

          {searchQuery.length === 1 && (
            <div style={{
              fontSize: 12,
              color: TEXT_LIGHT,
              fontFamily: body,
              marginBottom: 16,
              marginTop: -8
            }}>
              Type one more letter to search...
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#dc2626',
          fontSize: 13,
          fontFamily: body,
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {/* Selected drugs list */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 13,
            color: TEXT_MED,
            marginBottom: 10,
            fontFamily: body
          }}>
            Selected medications ({selected.length}):
          </div>
          {selected.map((drug) => (
            <div
              key={drug.id}
              style={{
                padding: '12px 16px',
                background: GREEN_LIGHT,
                borderRadius: 10,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: TEXT_DARK,
                  fontFamily: heading
                }}>
                  {drug.name}
                </div>
                {drug.genericName && (
                  <div style={{
                    fontSize: 12,
                    color: TEXT_MED,
                    fontFamily: body,
                    marginTop: 1
                  }}>
                    {drug.genericName}
                  </div>
                )}
                <div style={{
                  fontSize: 12,
                  color: TEXT_MED,
                  fontFamily: body,
                  marginTop: 2
                }}>
                  {drug.strength}{drug.strengthUOM} - Qty: {drug.qty} - {drug.frequencyLabel || 'Once daily'}
                </div>
              </div>
              <button
                onClick={() => handleRemoveDrug(drug.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: TEXT_LIGHT,
                  cursor: 'pointer',
                  padding: 4,
                  fontSize: 18,
                  lineHeight: 1
                }}
                aria-label="Remove medication"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons (only show when not configuring a drug) */}
      {!pendingDrug && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selected.length > 0 ? (
            <button
              onClick={handleContinue}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: GREEN,
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                fontFamily: heading,
                cursor: 'pointer'
              }}
            >
              Continue with {selected.length} medication{selected.length > 1 ? 's' : ''}
            </button>
          ) : (
            <button
              onClick={handleSkip}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: '#fff',
                border: `2px solid ${BORDER}`,
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                color: TEXT_MED,
                fontFamily: heading,
                cursor: 'pointer'
              }}
            >
              Skip for now
            </button>
          )}
        </div>
      )}

      {/* Back button (only show when not configuring a drug) */}
      {!pendingDrug && (
        <button
          onClick={onBack}
          style={{
            width: '100%',
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: TEXT_MED,
            padding: '10px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: heading,
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          ← Back
        </button>
      )}
    </div>
  );
}
