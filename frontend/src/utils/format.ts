const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatSalary(salary: number): string {
  return currencyFormatter.format(salary);
}

/**
 * Formats an ISO date (yyyy-MM-dd) as "01 Jul 2024". The string is split rather than parsed
 * with Date so a browser in a negative UTC offset never shows the previous day.
 */
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const monthName = MONTH_NAMES[Number(month) - 1];
  if (!year || !day || !monthName) {
    return isoDate;
  }
  return `${day} ${monthName} ${year}`;
}

export function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Today's date in the user's local time zone as yyyy-MM-dd. */
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
