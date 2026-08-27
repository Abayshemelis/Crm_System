import { validatePhoneNumber } from '../components/ui/countryData';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a person or entity name (First Name, Last Name, Company Name, etc.)
 */
export const validateName = (
  value?: string | null,
  fieldLabel = 'Name',
  minLength = 2,
  maxLength = 100
): string | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return `${fieldLabel} is required`;
  }
  if (trimmed.length < minLength) {
    return `${fieldLabel} must be at least ${minLength} characters`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldLabel} cannot exceed ${maxLength} characters`;
  }
  // Reject pure numbers or special symbols only for human names
  if (fieldLabel.toLowerCase().includes('name') && !fieldLabel.toLowerCase().includes('company') && /^[0-9!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?`~]+$/.test(trimmed)) {
    return `Please enter a valid ${fieldLabel.toLowerCase()}`;
  }
  return null;
};

/**
 * Validates email address format
 */
export const validateEmail = (
  value?: string | null,
  required = true,
  fieldLabel = 'Email address'
): string | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return required ? `${fieldLabel} is required` : null;
  }
  if (trimmed.length > 254) {
    return `${fieldLabel} is too long (maximum 254 characters)`;
  }
  // Standard RFC-compliant email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g. user@company.com)';
  }
  return null;
};

/**
 * Validates international/national phone number using country-aware helper
 */
export const validatePhone = (
  value?: string | null,
  required = false,
  fieldLabel = 'Phone number'
): string | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return required ? `${fieldLabel} is required` : null;
  }
  // Use countryData phone validator
  const err = validatePhoneNumber(trimmed);
  if (err) return err;

  // Basic sanity check for numeric digits
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 6 || digitsOnly.length > 15) {
    return 'Please enter a valid phone number with 6 to 15 digits';
  }
  return null;
};

/**
 * Validates URL (e.g. Website, LinkedIn, etc.)
 */
export const validateUrl = (
  value?: string | null,
  required = false,
  fieldLabel = 'Website URL'
): string | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return required ? `${fieldLabel} is required` : null;
  }
  let urlToTest = trimmed;
  if (!/^https?:\/\//i.test(urlToTest)) {
    urlToTest = `https://${urlToTest}`;
  }
  try {
    const parsed = new URL(urlToTest);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return `Please enter a valid ${fieldLabel.toLowerCase()} (e.g. https://example.com)`;
    }
    return null;
  } catch {
    return `Please enter a valid ${fieldLabel.toLowerCase()} (e.g. https://example.com)`;
  }
};

/**
 * Validates positive monetary or numerical amounts
 */
export const validatePositiveNumber = (
  value: number | string | null | undefined,
  fieldLabel = 'Amount',
  allowZero = false,
  max = 1_000_000_000
): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldLabel} is required`;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) {
    return `Please enter a valid number for ${fieldLabel.toLowerCase()}`;
  }
  if (!allowZero && num <= 0) {
    return `${fieldLabel} must be greater than zero`;
  }
  if (allowZero && num < 0) {
    return `${fieldLabel} cannot be negative`;
  }
  if (num > max) {
    return `${fieldLabel} exceeds maximum allowed value ($${max.toLocaleString()})`;
  }
  return null;
};

/**
 * Validates mandatory dropdown selection (rejects 0, empty string, null, undefined)
 */
export const validateRequiredSelect = (
  value: number | string | null | undefined,
  fieldLabel = 'Selection'
): string | null => {
  if (value === null || value === undefined || value === '' || value === 0 || value === '0') {
    return `Please select a ${fieldLabel.toLowerCase()}`;
  }
  return null;
};

/**
 * Validates start and end date ordering
 */
export const validateDateRange = (
  startDate?: string | null,
  endDate?: string | null,
  startLabel = 'Start Date',
  endLabel = 'End Date'
): string | null => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date format';
  }
  if (end < start) {
    return `${endLabel} cannot be earlier than ${startLabel}`;
  }
  return null;
};

/**
 * Validates maximum character length
 */
export const validateMaxLength = (
  value?: string | null,
  maxLength = 500,
  fieldLabel = 'Notes'
): string | null => {
  const trimmed = (value || '').trim();
  if (trimmed.length > maxLength) {
    return `${fieldLabel} cannot exceed ${maxLength} characters (currently ${trimmed.length})`;
  }
  return null;
};
