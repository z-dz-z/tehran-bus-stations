const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)]);
}

/**
 * Normalizes Persian/Arabic digits back to English digits (useful for search input)
 */
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Formats ETA string or ETAValue into user friendly Persian description
 */
export function formatETA(etaValue: number | null, etaText?: string): {
  displayText: string;
  badgeClass: string;
  status: 'arriving' | 'approaching' | 'far' | 'none';
} {
  if (etaValue === null || etaValue === undefined) {
    if (etaText && etaText.trim()) {
      return {
        displayText: toPersianDigits(etaText.trim()),
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        status: 'far'
      };
    }
    return {
      displayText: 'اطلاعات در دسترس نیست',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      status: 'none'
    };
  }

  if (etaValue <= 1) {
    return {
      displayText: 'در حال ورود به ایستگاه',
      badgeClass: 'bg-rose-500 text-white animate-pulse font-bold',
      status: 'arriving'
    };
  }

  if (etaValue <= 5) {
    return {
      displayText: `${toPersianDigits(etaValue)} دقیقه دیگر`,
      badgeClass: 'bg-emerald-600 text-white font-semibold',
      status: 'approaching'
    };
  }

  if (etaValue <= 15) {
    return {
      displayText: `${toPersianDigits(etaValue)} دقیقه دیگر`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium',
      status: 'far'
    };
  }

  return {
    displayText: `${toPersianDigits(etaValue)} دقیقه دیگر`,
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    status: 'far'
  };
}
