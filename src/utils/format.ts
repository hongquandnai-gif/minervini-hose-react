export function fmtNum(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtInt(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return Math.round(val).toLocaleString('en-US');
}

export function fmtPct(val: number | null | undefined, decimals = 1, signed = false): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  const sign = signed && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}%`;
}

export function fmtDateVn(isoDate: string | null | undefined): string {
  if (!isoDate || isoDate.length < 10) return '—';
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function subtractCalendarDays(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

export function diffDays(startIso: string, endIso: string): number {
  return Math.round((Date.parse(`${endIso}T00:00:00Z`) - Date.parse(`${startIso}T00:00:00Z`)) / 86400_000);
}
