export interface Country {
  code: string;       // ISO 3166-1 alpha-2 (e.g., 'US', 'ET')
  name: string;       // e.g. 'United States', 'Ethiopia'
  dialCode: string;   // e.g. '+1', '+251'
  flag: string;       // Unicode flag emoji (e.g. '🇺🇸', '🇪🇹')
  placeholder?: string; // Example format hint e.g. '(555) 000-0000'
  minDigits?: number;
  maxDigits?: number;
}

export const COUNTRIES: Country[] = [
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹', placeholder: '91 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', placeholder: '(555) 000-0000', minDigits: 10, maxDigits: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', placeholder: '7911 123456', minDigits: 10, maxDigits: 11 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', placeholder: '(555) 000-0000', minDigits: 10, maxDigits: 10 },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', placeholder: '151 23456789', minDigits: 10, maxDigits: 11 },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', placeholder: '412 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', placeholder: '98765 43210', minDigits: 10, maxDigits: 10 },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', placeholder: '138 0000 0000', minDigits: 11, maxDigits: 11 },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', placeholder: '90 1234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', placeholder: '11 91234-5678', minDigits: 10, maxDigits: 11 },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', placeholder: '55 1234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789', minDigits: 9, maxDigits: 10 },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', placeholder: '612 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678', minDigits: 9, maxDigits: 9 },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67', minDigits: 7, maxDigits: 10 },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', placeholder: '712 345678', minDigits: 9, maxDigits: 9 },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', placeholder: '802 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', placeholder: '71 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', placeholder: '100 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭', placeholder: '23 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼', placeholder: '788 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬', placeholder: '712 345678', minDigits: 9, maxDigits: 9 },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿', placeholder: '652 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', placeholder: '501 234 56 78', minDigits: 10, maxDigits: 10 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', placeholder: '8123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', placeholder: '10-1234-5678', minDigits: 9, maxDigits: 11 },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', placeholder: '812-345-678', minDigits: 9, maxDigits: 12 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', placeholder: '12-345 6789', minDigits: 9, maxDigits: 10 },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', placeholder: '917 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', placeholder: '300 1234567', minDigits: 10, maxDigits: 10 },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', placeholder: '1712-345678', minDigits: 10, maxDigits: 10 },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', placeholder: '91 234 56 78', minDigits: 9, maxDigits: 10 },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', placeholder: '81 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', placeholder: '21 123 4567', minDigits: 8, maxDigits: 10 },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', placeholder: '85 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', placeholder: '512 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', placeholder: '470 12 34 56', minDigits: 9, maxDigits: 9 },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', placeholder: '664 1234567', minDigits: 10, maxDigits: 11 },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567', minDigits: 8, maxDigits: 8 },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', placeholder: '20 12 34 56', minDigits: 8, maxDigits: 8 },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', placeholder: '40 1234567', minDigits: 9, maxDigits: 10 },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', placeholder: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', placeholder: '691 234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', placeholder: '601 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴', placeholder: '712 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺', placeholder: '20 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', placeholder: '50-123-4567', minDigits: 9, maxDigits: 9 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456', minDigits: 8, maxDigits: 8 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', placeholder: '5123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', placeholder: '9123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', placeholder: '3600 1234', minDigits: 8, maxDigits: 8 },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', placeholder: '11 1234-5678', minDigits: 10, maxDigits: 10 },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', placeholder: '9 1234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', placeholder: '300 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', placeholder: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦', placeholder: '50 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', placeholder: '912 345-67-89', minDigits: 10, maxDigits: 10 },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿', placeholder: '551 23 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', placeholder: '612-345678', minDigits: 9, maxDigits: 9 },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳', placeholder: '20 123 456', minDigits: 8, maxDigits: 8 },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳', placeholder: '77 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'CI', name: 'Ivory Coast', dialCode: '+225', flag: '🇨🇮', placeholder: '01 23 45 67 89', minDigits: 10, maxDigits: 10 },
  { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲', placeholder: '6 71 23 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲', placeholder: '97 1234567', minDigits: 9, maxDigits: 9 },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼', placeholder: '71 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴', placeholder: '923 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿', placeholder: '84 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩', placeholder: '91 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴', placeholder: '61 2345678', minDigits: 8, maxDigits: 9 },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯', placeholder: '77 12 34 56', minDigits: 8, maxDigits: 8 },
  { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷', placeholder: '7 123 456', minDigits: 7, maxDigits: 7 }
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Ethiopia (ET +251)

/**
 * Returns Flag CDN image URL for crisp SVG/PNG flag rendering
 */
export function getCountryFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

/**
 * Extracts country and national number from a raw phone string.
 * Supports:
 * - Full international formats: '+251 91 123 4567', '+1 555 123 4567'
 * - Digits with country code: '251911234567'
 * - Local formats: '0911234567', '911234567'
 */
export function parsePhoneNumber(rawPhone: string, fallbackCountry: Country = DEFAULT_COUNTRY): { country: Country; nationalNumber: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return { country: fallbackCountry, nationalNumber: '' };
  }

  const trimmed = rawPhone.trim();

  // 1. If starts with '+', match the longest dial code
  if (trimmed.startsWith('+')) {
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sortedCountries) {
      if (trimmed.startsWith(c.dialCode)) {
        let remainder = trimmed.slice(c.dialCode.length).trim();
        // Normalize leading zero for ET/GB
        if ((c.code === 'ET' || c.code === 'GB') && remainder.startsWith('0') && remainder.length > 9) {
          remainder = remainder.replace(/^0+/, '');
        }
        return { country: c, nationalNumber: remainder };
      }
    }
  }

  // 2. Check if starts with country dial code digits without '+' (e.g. '251911234567')
  const digitsOnly = trimmed.replace(/\D/g, '');
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sortedCountries) {
    const dialDigits = c.dialCode.replace('+', '');
    if (digitsOnly.startsWith(dialDigits) && digitsOnly.length >= (c.minDigits || 6) + dialDigits.length) {
      let remainder = digitsOnly.slice(dialDigits.length);
      if ((c.code === 'ET' || c.code === 'GB') && remainder.startsWith('0')) {
        remainder = remainder.replace(/^0+/, '');
      }
      return { country: c, nationalNumber: remainder };
    }
  }

  // 3. Otherwise, treats input as national number under fallbackCountry
  let cleanNational = trimmed;
  // If local format with leading 0 for ET (e.g. 0911234567), keep for display or clean on format
  return { country: fallbackCountry, nationalNumber: cleanNational };
}

/**
 * Formats country dial code + national number into a clean full international string.
 * Automatically normalizes local formats (e.g. 0911234567 -> +251 911234567).
 */
export function formatFullPhone(country: Country, nationalNumber: string): string {
  let cleanNumber = nationalNumber.trim();
  if (!cleanNumber) return '';

  // Auto-normalize leading zero for countries where local numbers start with 0 (e.g. Ethiopia 09/07, UK 07)
  if ((country.code === 'ET' || country.code === 'GB') && cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.replace(/^0+/, '');
  }

  return `${country.dialCode} ${cleanNumber}`;
}

/**
 * Validates a national or full phone number according to country rules.
 * Accepts both local (e.g. 0911234567 or 911234567) and international (+251 911234567) inputs.
 * Returns null if valid, or a descriptive error message if invalid.
 */
export function validatePhoneNumber(rawOrFormattedPhone: string, explicitCountry?: Country): string | null {
  if (!rawOrFormattedPhone || !rawOrFormattedPhone.trim()) {
    return null; // Empty is valid if not required
  }

  const parsed = explicitCountry 
    ? { country: explicitCountry, nationalNumber: rawOrFormattedPhone.replace(explicitCountry.dialCode, '').trim() }
    : parsePhoneNumber(rawOrFormattedPhone);

  const country = parsed.country;
  const national = parsed.nationalNumber.trim();
  const digitsOnly = national.replace(/\D/g, '');

  if (!national) {
    return null;
  }

  // Check for invalid non-numeric characters (allow standard separators: space, dash, dot, parentheses)
  if (/[^\d\s\-\.\(\)]/.test(national)) {
    return 'Phone number contains invalid characters.';
  }

  if (digitsOnly.length === 0) {
    return 'Please enter a valid phone number.';
  }

  // Country specific validations
  switch (country.code.toUpperCase()) {
    case 'ET': {
      // Ethiopia (+251):
      // Supports both local format (0911234567, 10 digits) and international format (911234567, 9 digits)
      const effectiveDigits = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
      
      if (effectiveDigits.length < 9) {
        return `Ethiopian phone number is too short (${effectiveDigits.length}/9 digits). Example: 91 123 4567 or 091 123 4567`;
      }
      if (effectiveDigits.length > 9) {
        return `Ethiopian phone number is too long (${effectiveDigits.length}/9 digits). Example: 91 123 4567`;
      }
      if (!/^[97]/.test(effectiveDigits)) {
        return 'Ethiopian mobile numbers start with 9 or 7 (e.g. 91 123 4567 or 091 123 4567)';
      }
      break;
    }

    case 'GB': {
      // United Kingdom (+44):
      const effectiveDigits = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
      if (effectiveDigits.length < 10 || effectiveDigits.length > 11) {
        return 'UK phone numbers should be 10 or 11 digits (e.g., 7911 123456).';
      }
      break;
    }

    case 'US':
    case 'CA': {
      // US & Canada (+1):
      const effectiveDigits = (digitsOnly.length === 11 && digitsOnly.startsWith('1')) ? digitsOnly.slice(1) : digitsOnly;
      if (effectiveDigits.startsWith('0') || effectiveDigits.startsWith('1')) {
        return 'Area code in North America (+1) cannot start with 0 or 1.';
      }
      if (effectiveDigits.length !== 10) {
        return `Phone number for ${country.name} must be 10 digits (currently ${effectiveDigits.length}).`;
      }
      break;
    }

    case 'IN': {
      // India (+91):
      const effectiveDigits = (digitsOnly.length === 11 && digitsOnly.startsWith('0')) ? digitsOnly.slice(1) : digitsOnly;
      if (effectiveDigits.length !== 10) {
        return `Indian phone numbers must be 10 digits (currently ${effectiveDigits.length}).`;
      }
      break;
    }

    default: {
      const min = country.minDigits || 6;
      const max = country.maxDigits || 15;
      if (digitsOnly.length < min) {
        return `Phone number is too short for ${country.name} (minimum ${min} digits).`;
      }
      if (digitsOnly.length > max) {
        return `Phone number is too long for ${country.name} (maximum ${max} digits).`;
      }
      break;
    }
  }

  return null;
}
