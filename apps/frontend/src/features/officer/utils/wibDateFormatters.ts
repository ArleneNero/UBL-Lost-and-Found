const wibDateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const wibDateLongFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const wibDateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatWibDate(isoString: string, long = false): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return long ? wibDateLongFormatter.format(date) : wibDateFormatter.format(date);
}

export function formatWibDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return `${wibDateTimeFormatter.format(date)} WIB`;
}
