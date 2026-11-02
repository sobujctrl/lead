/**
 * অনুমোদিত ইমেইল তালিকা কনফিগারেশন (Authorized Emails Configuration)
 *
 * আপনি এখানে সহজে নতুন কোনো ইমেইল যুক্ত করতে পারেন অথবা বাদ দিতে পারেন।
 * এই তালিকায় থাকা যেকোনো ইমেইল Google Sign-In দিয়ে সিস্টেমে প্রবেশ করতে পারবে।
 */

const envAllowedEmails = import.meta.env?.VITE_ALLOWED_EMAILS
  ? String(import.meta.env.VITE_ALLOWED_EMAILS)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : [];

export const ALLOWED_EMAILS: string[] = envAllowedEmails.length > 0
  ? envAllowedEmails
  : [
      'sobujbd679@gmail.com',
      'teammate1@gmail.com',
      'teammate2@gmail.com',
    ];

/**
 * কোনো ইমেইল অনুমোদিত কি না তা পরীক্ষা করে
 */
export function isEmailAllowed(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ALLOWED_EMAILS.some((allowed) => allowed.trim().toLowerCase() === cleanEmail);
}

/**
 * প্রাথমিক সুপার অ্যাডমিন ইমেইল (ডিফল্ট/ফলব্যাক হিসেবে ব্যবহৃত)
 */
export const PRIMARY_ADMIN_EMAIL = ALLOWED_EMAILS[0] || 'sobujbd679@gmail.com';
