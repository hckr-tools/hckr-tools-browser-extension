export interface CronSchedule {
  seconds: Set<number> | null;
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  domUnrestricted: boolean;
  dowUnrestricted: boolean;
  isReboot: boolean;
  raw: string;
}

export interface CronParseResult {
  schedule: CronSchedule | null;
  error: string | null;
  description: string;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ALIASES: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const FIELD_BOUNDS = {
  second: { min: 0, max: 59 },
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 },
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function expandField(
  raw: string,
  kind: keyof typeof FIELD_BOUNDS,
): { values: Set<number>; unrestricted: boolean } {
  const { min, max } = FIELD_BOUNDS[kind];
  const names = kind === 'month' ? MONTH_NAMES : kind === 'dayOfWeek' ? DOW_NAMES : null;
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error(`Empty ${kind} field`);
  }
  if (/[LW#]/i.test(trimmed)) {
    throw new Error('Quartz special characters (L, W, #) are not supported.');
  }

  const unrestricted = trimmed === '*' || trimmed === '?';
  const values = new Set<number>();

  for (const part of trimmed.split(',')) {
    const piece = part.trim();
    if (!piece) throw new Error(`Invalid ${kind} field`);

    const [rangePart, stepPart] = piece.split('/');
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`Invalid step in ${kind} field`);
    }

    let start: number;
    let end: number;
    if (rangePart === '*' || rangePart === '?') {
      start = min;
      end = max;
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-');
      start = parseToken(a, names, kind);
      end = parseToken(b, names, kind);
      if (start > end) {
        throw new Error(`Inverted range in ${kind} field`);
      }
    } else {
      start = parseToken(rangePart, names, kind);
      end = stepPart === undefined ? start : max;
    }

    if (start < min || end > max) {
      throw new Error(`${kind} value out of range (${min}–${max})`);
    }

    for (let n = start; n <= end; n += step) {
      values.add(kind === 'dayOfWeek' && n === 7 ? 0 : n);
    }
  }

  return { values, unrestricted };
}

function parseToken(
  token: string,
  names: Record<string, number> | null,
  kind: string,
): number {
  const raw = token.trim().toLowerCase();
  if (names && names[raw] !== undefined) {
    return names[raw];
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid ${kind} token "${token}"`);
  }
  return Number(raw);
}

export function parseCronExpression(input: string): CronParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { schedule: null, error: null, description: '' };
  }

  if (trimmed.toLowerCase() === '@reboot') {
    const schedule: CronSchedule = {
      seconds: null,
      minutes: new Set(),
      hours: new Set(),
      daysOfMonth: new Set(),
      months: new Set(),
      daysOfWeek: new Set(),
      domUnrestricted: true,
      dowUnrestricted: true,
      isReboot: true,
      raw: trimmed,
    };
    return {
      schedule,
      error: null,
      description: 'At system startup. This is not a calendar schedule, so upcoming run times cannot be listed.',
    };
  }

  const aliased = ALIASES[trimmed.toLowerCase()] ?? trimmed;
  const fields = aliased.split(/\s+/).filter(Boolean);

  try {
    let seconds: Set<number> | null = null;
    let minuteField: string;
    let hourField: string;
    let domField: string;
    let monthField: string;
    let dowField: string;

    if (fields.length === 5) {
      [minuteField, hourField, domField, monthField, dowField] = fields;
    } else if (fields.length === 6) {
      const secondField = fields[0];
      seconds = expandField(secondField, 'second').values;
      [, minuteField, hourField, domField, monthField, dowField] = fields;
    } else {
      return {
        schedule: null,
        error: 'Cron expressions need 5 fields (Unix) or 6 fields (with seconds), or an alias like @hourly.',
        description: '',
      };
    }

    const minutes = expandField(minuteField, 'minute');
    const hours = expandField(hourField, 'hour');
    const daysOfMonth = expandField(domField, 'dayOfMonth');
    const months = expandField(monthField, 'month');
    const daysOfWeek = expandField(dowField, 'dayOfWeek');

    const schedule: CronSchedule = {
      seconds,
      minutes: minutes.values,
      hours: hours.values,
      daysOfMonth: daysOfMonth.values,
      months: months.values,
      daysOfWeek: daysOfWeek.values,
      domUnrestricted: daysOfMonth.unrestricted,
      dowUnrestricted: daysOfWeek.unrestricted,
      isReboot: false,
      raw: trimmed,
    };

    return {
      schedule,
      error: null,
      description: describeCron(schedule),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid cron expression.';
    return { schedule: null, error: message, description: '' };
  }
}

function sorted(set: Set<number>): number[] {
  return [...set].sort((a, b) => a - b);
}

function describeList(values: number[], labels?: string[]): string {
  const names = values.map((v) => (labels ? labels[v] : String(v)));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function isContiguous(values: number[]): boolean {
  if (values.length < 2) return true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return false;
  }
  return true;
}

function describeCron(schedule: CronSchedule): string {
  const minutes = sorted(schedule.minutes);
  const hours = sorted(schedule.hours);
  const days = sorted(schedule.daysOfMonth);
  const months = sorted(schedule.months);
  const dows = sorted(schedule.daysOfWeek);

  const parts: string[] = [];

  if (schedule.seconds && schedule.seconds.size === 1 && minutes.length === 1 && hours.length === 1) {
    const s = [...schedule.seconds][0];
    parts.push(`At ${pad2(hours[0])}:${pad2(minutes[0])}:${pad2(s)}`);
  } else if (minutes.length === 1 && hours.length === 1 && !schedule.seconds) {
    parts.push(`At ${pad2(hours[0])}:${pad2(minutes[0])}`);
  } else if (minutes.length === 1 && hours.length === 24 && !schedule.seconds) {
    parts.push(`At minute ${minutes[0]} of every hour`);
  } else if (
    !schedule.seconds
    && hours.length === 24
    && minutes.length > 1
    && minutes.length < 60
    && isContiguous(minutes) === false
    && minutes.every((m, i) => i === 0 || m - minutes[i - 1] === minutes[1] - minutes[0])
    && minutes[0] === 0
  ) {
    const step = minutes[1] - minutes[0];
    parts.push(`Every ${step} minutes`);
  } else if (!schedule.seconds && minutes.length === 60 && hours.length === 24) {
    parts.push('Every minute');
  } else {
    const minuteText = minutes.length === 60 ? 'every minute' : `minute ${describeList(minutes)}`;
    const hourText = hours.length === 24 ? 'every hour' : `hour ${describeList(hours)}`;
    parts.push(`At ${minuteText}, ${hourText}`);
  }

  if (!schedule.dowUnrestricted && !schedule.domUnrestricted) {
    const dowText = isContiguous(dows) && dows.length > 1
      ? `${DOW_LABELS[dows[0]]} through ${DOW_LABELS[dows[dows.length - 1]]}`
      : describeList(dows, DOW_LABELS);
    parts.push(`on day ${describeList(days)} of the month or on ${dowText}`);
  } else if (!schedule.dowUnrestricted) {
    if (isContiguous(dows) && dows.length > 1) {
      parts.push(`on ${DOW_LABELS[dows[0]]} through ${DOW_LABELS[dows[dows.length - 1]]}`);
    } else {
      parts.push(`on ${describeList(dows, DOW_LABELS)}`);
    }
  } else if (!schedule.domUnrestricted) {
    parts.push(`on day ${describeList(days)} of the month`);
  }

  if (months.length !== 12) {
    if (isContiguous(months) && months.length > 1) {
      parts.push(`in ${MONTH_LABELS[months[0] - 1]} through ${MONTH_LABELS[months[months.length - 1] - 1]}`);
    } else {
      parts.push(`in ${describeList(months.map((m) => m - 1), MONTH_LABELS)}`);
    }
  }

  return `${parts.join(', ')}.`;
}

export function getZonedParts(date: Date, timeZone: string | undefined): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: weekdayMap[map.weekday] ?? 0,
  };
}

function dayMatches(parts: ZonedParts, schedule: CronSchedule): boolean {
  const domOk = schedule.daysOfMonth.has(parts.day);
  const dowOk = schedule.daysOfWeek.has(parts.weekday);
  if (schedule.domUnrestricted && schedule.dowUnrestricted) return true;
  if (schedule.domUnrestricted) return dowOk;
  if (schedule.dowUnrestricted) return domOk;
  return domOk || dowOk;
}

function matches(parts: ZonedParts, schedule: CronSchedule): boolean {
  if (!schedule.months.has(parts.month)) return false;
  if (!dayMatches(parts, schedule)) return false;
  if (!schedule.hours.has(parts.hour)) return false;
  if (!schedule.minutes.has(parts.minute)) return false;
  if (schedule.seconds) {
    return schedule.seconds.has(parts.second);
  }
  return parts.second === 0;
}

export function nextCronRuns(
  schedule: CronSchedule,
  from: Date,
  timeZone: string | undefined,
  count: number,
): Date[] {
  if (schedule.isReboot || count <= 0) return [];

  const stepMs = schedule.seconds ? 1000 : 60 * 1000;
  const results: Date[] = [];
  let cursor = new Date(Math.floor(from.getTime() / 1000) * 1000 + 1000);
  if (!schedule.seconds) {
    const extra = cursor.getUTCSeconds();
    if (extra !== 0) {
      cursor = new Date(cursor.getTime() + (60 - extra) * 1000);
    }
  }
  const maxSteps = schedule.seconds ? 120 * 24 * 60 * 60 : 400 * 24 * 60;

  for (let step = 0; step < maxSteps && results.length < count; step++) {
    const parts = getZonedParts(cursor, timeZone);
    if (matches(parts, schedule) && cursor.getTime() > from.getTime()) {
      results.push(new Date(cursor.getTime()));
    }
    cursor = new Date(cursor.getTime() + stepMs);
  }

  return results;
}

export function formatInZone(date: Date, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timeZone || undefined,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date);
}

export function formatRelative(from: Date, to: Date): string {
  const diffSec = Math.round((to.getTime() - from.getTime()) / 1000);
  if (diffSec < 60) return 'in under a minute';
  const intervals: { unit: string; seconds: number }[] = [
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(diffSec / interval.seconds);
    if (count >= 1) {
      return `in ${count} ${interval.unit}${count === 1 ? '' : 's'}`;
    }
  }
  return 'soon';
}
