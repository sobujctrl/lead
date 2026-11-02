/**
 * Utility functions for Bangladesh phone numbers and contact actions
 */

// Bengali to English digit mapping
const BENGALI_TO_ENGLISH_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

/**
 * Converts any Bengali numerals in a string to standard English digits
 */
export function convertBengaliDigitsToEnglish(input: string): string {
  return input.replace(/[০-৯]/g, (char) => BENGALI_TO_ENGLISH_DIGITS[char] || char);
}

/**
 * Normalizes a Bangladeshi phone number into standard 11-digit format: 01XXXXXXXXX
 * Handles formats like:
 * - +8801712345678
 * - 8801712345678
 * - 01712-345678
 * - 01712 345 678
 * - Bengali numerals: ০১৭১২৩৪৫৬৭৮
 */
export function normalizeBdPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone || !rawPhone.trim()) return '';
  
  // Step 1: Convert Bengali digits to English
  let clean = convertBengaliDigitsToEnglish(rawPhone.trim());
  
  // Step 2: Strip all non-digit characters except leading plus if any
  clean = clean.replace(/[^0-9]/g, '');

  // Step 3: Handle international prefix
  if (clean.startsWith('880')) {
    clean = clean.substring(2); // removes 88, keeps 01...
  } else if (clean.startsWith('80') && clean.length === 12) {
    clean = '0' + clean.substring(2);
  }

  // If user entered 10 digits starting with 1 (e.g. 1712345678), prepend 0
  if (clean.length === 10 && clean.startsWith('1')) {
    clean = '0' + clean;
  }

  return clean;
}

/**
 * Formats phone number for clean readability: 01711-223344
 */
export function formatBdPhoneNumber(phone?: string | null): string {
  if (!phone || !phone.trim()) return '';
  const normalized = normalizeBdPhoneNumber(phone);
  if (normalized.length === 11 && normalized.startsWith('01')) {
    return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
  }
  return phone;
}

/**
 * Checks whether a normalized phone is a valid Bangladeshi mobile number
 * Format: 11 digits starting with 013, 014, 015, 016, 017, 018, 019
 */
export function isValidBdPhoneNumber(phone?: string | null): boolean {
  if (!phone || !phone.trim()) return false;
  const normalized = normalizeBdPhoneNumber(phone);
  const bdMobileRegex = /^01[3-9]\d{8}$/;
  return bdMobileRegex.test(normalized);
}

/**
 * Generates an international WhatsApp wa.me URL
 * e.g., https://wa.me/8801712345678?text=...
 */
export function getWhatsAppLink(phone?: string | null, customerName = '', customMessage?: string): string {
  if (!phone || !phone.trim()) return '#';
  const normalized = normalizeBdPhoneNumber(phone);
  if (!normalized) return '#';
  const internationalNumber = normalized.startsWith('0') 
    ? '88' + normalized 
    : normalized;

  const defaultGreeting = customMessage || (customerName 
    ? `আসসালামু আলাইকুম ${customerName} ভাই/ম্যাম, আপনার অনুসন্ধানের ব্যাপারে যোগাযোগ করছি। আমরা কি কথা বলতে পারি?`
    : `আসসালামু আলাইকুম, আপনার অনুসন্ধানের ব্যাপারে যোগাযোগ করছি। আমরা কি কথা বলতে পারি?`);

  const encodedText = encodeURIComponent(defaultGreeting);
  return `https://wa.me/${internationalNumber}?text=${encodedText}`;
}

/**
 * Generates tel: URL for direct mobile calling
 */
export function getPhoneCallLink(phone?: string | null): string {
  if (!phone || !phone.trim()) return '#';
  const normalized = normalizeBdPhoneNumber(phone);
  if (!normalized) return '#';
  return `tel:${normalized}`;
}

