/**
 * Minimal standard 5-field cron ("minute hour day-of-month month day-of-week")
 * next-run calculator. Supports `*`, `* /n` steps, `a,b` lists, `a-b` ranges,
 * and plain numbers — covering the app's schedule presets and typical custom
 * expressions. Day-of-week is 0-6 (Sunday = 0; 7 also accepted as Sunday).
 *
 * This is intentionally dependency-free; it is not a full cron implementation
 * (no `L`, `W`, `#`, names, or seconds field).
 */

interface CronFields {
    minutes: Set<number>;
    hours: Set<number>;
    daysOfMonth: Set<number>;
    months: Set<number>;
    daysOfWeek: Set<number>;
    /** True when day-of-month was restricted (not `*`). */
    domRestricted: boolean;
    /** True when day-of-week was restricted (not `*`). */
    dowRestricted: boolean;
}

/** Expands one cron field into the set of allowed values within [min,max]. */
function parseField(field: string, min: number, max: number): Set<number> {
    const out = new Set<number>();
    for (const part of field.split(',')) {
        const [rangePart, stepPart] = part.split('/');
        const step = stepPart ? parseInt(stepPart, 10) : 1;
        if (!Number.isFinite(step) || step <= 0) {
            throw new Error(`Invalid step in "${part}"`);
        }

        let lo: number;
        let hi: number;
        if (rangePart === '*' || rangePart === '') {
            lo = min;
            hi = max;
        } else if (rangePart.includes('-')) {
            const [a, b] = rangePart.split('-').map((n) => parseInt(n, 10));
            lo = a;
            hi = b;
        } else {
            lo = hi = parseInt(rangePart, 10);
        }

        if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < min || hi > max || lo > hi) {
            throw new Error(`Out-of-range field "${part}"`);
        }

        for (let v = lo; v <= hi; v += step) {
            out.add(v);
        }
    }
    return out;
}

/** Parses a 5-field cron string into expanded value sets. Throws on invalid. */
export function parseCron(expression: string): CronFields {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
        throw new Error('Cron expression must have 5 fields');
    }
    const [m, h, dom, mon, dowRaw] = parts;

    const daysOfWeek = parseField(dowRaw, 0, 7);
    // Normalize 7 -> 0 (both mean Sunday).
    if (daysOfWeek.has(7)) {
        daysOfWeek.add(0);
        daysOfWeek.delete(7);
    }

    return {
        minutes: parseField(m, 0, 59),
        hours: parseField(h, 0, 23),
        daysOfMonth: parseField(dom, 1, 31),
        months: parseField(mon, 1, 12),
        daysOfWeek,
        domRestricted: dom.trim() !== '*',
        dowRestricted: dowRaw.trim() !== '*',
    };
}

/** Whether a given date's day matches the cron day-of-month / day-of-week.
 *  Follows cron semantics: when both DOM and DOW are restricted, a match on
 *  EITHER is sufficient; otherwise the restricted one(s) must match. */
function dayMatches(date: Date, fields: CronFields): boolean {
    const dom = date.getDate();
    const dow = date.getDay();
    if (fields.domRestricted && fields.dowRestricted) {
        return fields.daysOfMonth.has(dom) || fields.daysOfWeek.has(dow);
    }
    if (fields.domRestricted) {
        return fields.daysOfMonth.has(dom);
    }
    if (fields.dowRestricted) {
        return fields.daysOfWeek.has(dow);
    }
    return true;
}

/**
 * Computes the next fire time strictly after `from` (default: now) in local
 * time. Returns null if the expression is invalid or no time is found within
 * a safe search horizon (~4 years).
 */
export function nextRun(expression: string | null | undefined, from: Date = new Date()): Date | null {
    if (!expression) {
        return null;
    }
    let fields: CronFields;
    try {
        fields = parseCron(expression);
    } catch {
        return null;
    }

    // Start at the next whole minute after `from`.
    const candidate = new Date(from.getTime());
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    // Bound the scan so a never-matching expression can't loop forever.
    const maxIterations = 366 * 4 * 24 * 60; // ~4 years of minutes
    for (let i = 0; i < maxIterations; i++) {
        if (
            fields.months.has(candidate.getMonth() + 1) &&
            dayMatches(candidate, fields) &&
            fields.hours.has(candidate.getHours()) &&
            fields.minutes.has(candidate.getMinutes())
        ) {
            return candidate;
        }
        candidate.setMinutes(candidate.getMinutes() + 1);
    }
    return null;
}
