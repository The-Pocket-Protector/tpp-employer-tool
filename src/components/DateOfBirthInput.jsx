/**
 * DateOfBirthInput - Date of birth input with MM/DD/YYYY format
 */

import { useState, useRef, useCallback } from 'react';
import {
  GREEN,
  TEXT_DARK,
  TEXT_MED,
  TEXT_LIGHT,
  BORDER,
  heading,
  body,
  RED
} from '../constants/styles';

/**
 * @param {Object} props
 * @param {function} props.onSubmit - Callback when valid date is submitted (receives YYYYMMDD format)
 * @param {function} props.onBack - Callback for back button
 * @param {string} props.subscriberName - Name of subscriber for display
 */
export default function DateOfBirthInput({ onSubmit, onBack, subscriberName }) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  const dayRef = useRef(null);
  const yearRef = useRef(null);

  const handleMonthChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(value);
    setError('');
    if (value.length === 2) {
      dayRef.current?.focus();
    }
  }, []);

  const handleDayChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(value);
    setError('');
    if (value.length === 2) {
      yearRef.current?.focus();
    }
  }, []);

  const handleYearChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(value);
    setError('');
  }, []);

  const validateDate = useCallback(() => {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);

    if (!month || !day || !year) {
      setError('Please enter a complete date');
      return null;
    }

    if (m < 1 || m > 12) {
      setError('Month must be between 01 and 12');
      return null;
    }

    if (d < 1 || d > 31) {
      setError('Day must be between 01 and 31');
      return null;
    }

    const currentYear = new Date().getFullYear();
    if (y < 1900 || y > currentYear) {
      setError(`Year must be between 1900 and ${currentYear}`);
      return null;
    }

    // Validate the actual date
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date.getDate() !== d) {
      setError('Please enter a valid date');
      return null;
    }

    // Format as YYYYMMDD
    return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  }, [month, day, year]);

  const handleSubmit = useCallback(() => {
    const formattedDate = validateDate();
    if (formattedDate) {
      onSubmit(formattedDate);
    }
  }, [validateDate, onSubmit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    border: `2px solid ${error ? RED : BORDER}`,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: 600,
    fontFamily: heading,
    color: TEXT_DARK,
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.15s'
  };

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: TEXT_LIGHT,
        marginBottom: 8,
        fontFamily: heading
      }}>
        Date of Birth
      </div>

      <div style={{
        fontFamily: heading,
        fontSize: 24,
        fontWeight: 800,
        color: TEXT_DARK,
        marginBottom: 8
      }}>
        When were you born?
      </div>

      <div style={{
        fontSize: 15,
        color: TEXT_MED,
        lineHeight: 1.6,
        marginBottom: 24,
        fontFamily: body
      }}>
        {subscriberName ? (
          <>We need your date of birth to verify {subscriberName}'s eligibility.</>
        ) : (
          <>We need your date of birth to verify your eligibility with your insurance carrier.</>
        )}
      </div>

      {/* Date inputs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1.5fr',
        gap: 12,
        marginBottom: 16
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MED,
            marginBottom: 6,
            fontFamily: body
          }}>
            Month
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM"
            value={month}
            onChange={handleMonthChange}
            onKeyDown={handleKeyDown}
            style={inputStyle}
            maxLength={2}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MED,
            marginBottom: 6,
            fontFamily: body
          }}>
            Day
          </label>
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            placeholder="DD"
            value={day}
            onChange={handleDayChange}
            onKeyDown={handleKeyDown}
            style={inputStyle}
            maxLength={2}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MED,
            marginBottom: 6,
            fontFamily: body
          }}>
            Year
          </label>
          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            placeholder="YYYY"
            value={year}
            onChange={handleYearChange}
            onKeyDown={handleKeyDown}
            style={inputStyle}
            maxLength={4}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          fontSize: 13,
          color: RED,
          marginBottom: 16,
          fontFamily: body
        }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!month || !day || year.length < 4}
        style={{
          width: '100%',
          padding: '16px 28px',
          background: (!month || !day || year.length < 4) ? BORDER : GREEN,
          border: 'none',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 700,
          color: (!month || !day || year.length < 4) ? TEXT_LIGHT : '#fff',
          fontFamily: heading,
          cursor: (!month || !day || year.length < 4) ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s'
        }}
      >
        Continue
      </button>

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            width: '100%',
            marginTop: 12,
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
