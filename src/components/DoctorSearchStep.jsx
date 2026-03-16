/**
 * DoctorSearchStep - Simple form-based doctor search with autocomplete
 * Uses NPI Registry for both name and specialty search
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchProviders } from '../services/npi.service';
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
 * @param {string} props.zipCode - User's ZIP code (or comma-separated radius zipcodes)
 * @param {string} props.state - User's 2-letter state code (e.g., "NY")
 * @param {string} props.county - User's county name
 * @param {Array} props.selectedDoctors - Already selected doctors
 * @param {function} props.onComplete - Callback with selected doctors array
 * @param {function} props.onBack - Callback to go back
 */
export default function DoctorSearchStep({ zipCode, state, county, selectedDoctors = [], onComplete, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState([...selectedDoctors]);
  const [error, setError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Get primary ZIP code (first one if comma-separated)
  const primaryZip = zipCode?.split(',')[0]?.trim() || zipCode;

  // Search providers when query changes (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    // Set searching immediately to prevent "no results" flash during debounce
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      setError(null);

      try {
        // Search by name first, then specialty - uses exact ZIP code
        const results = await searchProviders(searchQuery, state, primaryZip);

        // Filter out already selected providers
        const selectedIds = new Set(selected.map(d => d.id));
        const filtered = (results || []).filter(p => !selectedIds.has(p.id));

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Provider search error:', err);
        setError('Failed to search providers. Please try again.');
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, state, primaryZip, selected]);

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
          handleSelectProvider(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, highlightedIndex]);

  // Get specialty string from provider (handles both array and string formats)
  const getSpecialty = (provider) => {
    if (Array.isArray(provider.specialties)) {
      return provider.specialties.join(', ');
    }
    return provider.specialties || provider.specialty || '';
  };

  // Get city/state display
  const getCityState = (provider) => {
    if (provider.city && provider.state) {
      return `${provider.city}, ${provider.state}`;
    }
    return '';
  };

  // Select a provider
  const handleSelectProvider = (provider) => {
    const newDoctor = {
      id: provider.id,
      name: provider.name,
      npi: provider.npi || provider.id,
      specialties: getSpecialty(provider),
      address: formatAddress(provider),
      city: provider.city,
      state: provider.state,
      phone: provider.phone || ''
    };

    setSelected(prev => [...prev, newDoctor]);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Remove a selected doctor
  const handleRemoveDoctor = (doctorId) => {
    setSelected(prev => prev.filter(d => d.id !== doctorId));
  };

  // Format address for display
  const formatAddress = (provider) => {
    const parts = [];
    if (provider.address1) parts.push(provider.address1);
    if (provider.address) parts.push(provider.address);
    if (provider.city) parts.push(provider.city);
    if (provider.state) parts.push(provider.state);
    if (provider.zip) parts.push(provider.zip);
    return parts.join(', ');
  };

  // Handle continue
  const handleContinue = () => {
    onComplete(selected);
  };

  // Handle skip
  const handleSkip = () => {
    onComplete([]);
  };

  // Check if we should show "no results" state
  const showNoResults = suggestions.length === 0 &&
    searchQuery.length >= 2 &&
    !isSearching;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name or specialty..."
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
        {isSearching && (
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
              maxHeight: 400,
              overflowY: 'auto',
              background: '#fff',
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              marginTop: 4
            }}
          >
            {suggestions.map((provider, index) => (
              <div
                key={provider.id}
                onClick={() => handleSelectProvider(provider)}
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
                  fontFamily: heading,
                  marginBottom: 2
                }}>
                  {provider.name}
                </div>
                {getSpecialty(provider) && (
                  <div style={{
                    fontSize: 12,
                    color: GREEN,
                    fontFamily: body,
                    marginBottom: 2
                  }}>
                    {getSpecialty(provider)}
                  </div>
                )}
                <div style={{
                  fontSize: 12,
                  color: TEXT_MED,
                  fontFamily: body
                }}>
                  {getCityState(provider) || formatAddress(provider)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No results message */}
      {showNoResults && (
        <div style={{
          padding: '16px',
          background: GREEN_LIGHT,
          borderRadius: 10,
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: 14,
            color: TEXT_DARK,
            fontFamily: body,
            margin: 0
          }}>
            No providers found. Try a different name or specialty.
          </p>
        </div>
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

      {/* Selected doctors list */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 13,
            color: TEXT_MED,
            marginBottom: 10,
            fontFamily: body
          }}>
            Selected doctors ({selected.length}):
          </div>
          {selected.map((doctor) => (
            <div
              key={doctor.id}
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
                  {doctor.name}
                </div>
                {doctor.specialties && (
                  <div style={{
                    fontSize: 12,
                    color: GREEN,
                    fontFamily: body,
                    marginTop: 2
                  }}>
                    {doctor.specialties}
                  </div>
                )}
                {(doctor.city && doctor.state) ? (
                  <div style={{
                    fontSize: 12,
                    color: TEXT_MED,
                    fontFamily: body,
                    marginTop: 2
                  }}>
                    {doctor.city}, {doctor.state}
                  </div>
                ) : doctor.address && (
                  <div style={{
                    fontSize: 12,
                    color: TEXT_MED,
                    fontFamily: body,
                    marginTop: 2
                  }}>
                    {doctor.address}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveDoctor(doctor.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: TEXT_LIGHT,
                  cursor: 'pointer',
                  padding: 4,
                  fontSize: 18,
                  lineHeight: 1
                }}
                aria-label="Remove doctor"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
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
            Continue with {selected.length} doctor{selected.length > 1 ? 's' : ''}
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

      {/* Back button */}
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
    </div>
  );
}
