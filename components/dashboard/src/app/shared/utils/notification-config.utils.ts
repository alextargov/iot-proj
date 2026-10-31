/**
 * Shared helpers for the rule & alert form builders:
 *  - evaluating OR-of-AND condition groups against recent metric values
 *    ("test against recent metrics"), and
 *  - converting between structured notification inputs and the raw JSON
 *    config string the backend stores.
 *
 * Operator tokens are the string values shared by both
 * `AlertConditionOperator` and `RuleConditionOperator` (EQ/GT/GTE/LT/LTE/NE),
 * so this module stays decoupled from either generated enum.
 */

/** A single condition as entered in either form builder. */
export interface TestCondition {
    metricName: string;
    operator: string;
    threshold: number;
}

/** A group of conditions combined with AND. Groups are combined with OR. */
export interface TestGroup {
    conditions: TestCondition[];
}

/** Per-condition evaluation detail for the preview UI. */
export interface ConditionResult {
    metricName: string;
    operator: string;
    threshold: number;
    /** Most recent observed value, or null when the metric has no data. */
    actual: number | null;
    /** True when the condition held for the observed value. */
    matched: boolean;
    /** True when no recent value exists for this metric. */
    missing: boolean;
}

export interface GroupResult {
    conditions: ConditionResult[];
    /** AND of this group's conditions. */
    matched: boolean;
}

export interface TestResult {
    /** OR across all groups — whether the rule/alert would fire. */
    wouldFire: boolean;
    groups: GroupResult[];
    /** True when at least one referenced metric had no recent data. */
    hasMissing: boolean;
    /** True when there were no evaluable conditions at all. */
    empty: boolean;
}

/** Applies a single comparison. Unknown operators never match. */
export function compare(actual: number, operator: string, threshold: number): boolean {
    switch (operator) {
        case 'GT':
            return actual > threshold;
        case 'LT':
            return actual < threshold;
        case 'GTE':
            return actual >= threshold;
        case 'LTE':
            return actual <= threshold;
        case 'EQ':
            return actual === threshold;
        case 'NE':
            return actual !== threshold;
        default:
            return false;
    }
}

/**
 * Evaluates the condition groups against the latest value observed per metric.
 * `latestByMetric` maps metric name → most recent numeric value.
 */
export function evaluateConditions(
    groups: TestGroup[],
    latestByMetric: Map<string, number>
): TestResult {
    const groupResults: GroupResult[] = [];
    let hasMissing = false;
    let conditionCount = 0;

    for (const group of groups) {
        const conditionResults: ConditionResult[] = [];
        for (const cond of group.conditions) {
            if (!cond.metricName) {
                continue;
            }
            conditionCount++;
            const hasValue = latestByMetric.has(cond.metricName);
            const actual = hasValue ? latestByMetric.get(cond.metricName)! : null;
            const missing = !hasValue;
            if (missing) {
                hasMissing = true;
            }
            const threshold = Number(cond.threshold);
            conditionResults.push({
                metricName: cond.metricName,
                operator: cond.operator,
                threshold,
                actual,
                // A missing metric can't satisfy its condition.
                matched: actual !== null && compare(actual, cond.operator, threshold),
                missing,
            });
        }

        if (conditionResults.length === 0) {
            continue;
        }

        groupResults.push({
            conditions: conditionResults,
            matched: conditionResults.every((c) => c.matched),
        });
    }

    return {
        wouldFire: groupResults.some((g) => g.matched),
        groups: groupResults,
        hasMissing,
        empty: conditionCount === 0,
    };
}

// --- Notification config (structured <-> raw JSON) -------------------------

export type NotificationChannel = 'email' | 'webhook' | string;

export interface StructuredNotification {
    recipients: string[];
    url: string;
}

/**
 * Parses a stored config JSON string into structured fields. Tolerates empty
 * or malformed input by returning empty structured values (the raw string is
 * preserved separately by the caller for the advanced editor).
 */
export function parseNotificationConfig(raw: string | null | undefined): StructuredNotification {
    const empty: StructuredNotification = { recipients: [], url: '' };
    if (!raw) {
        return empty;
    }
    try {
        const parsed = JSON.parse(raw);
        const recipients = Array.isArray(parsed?.recipients)
            ? parsed.recipients.filter((r: unknown): r is string => typeof r === 'string')
            : [];
        const url = typeof parsed?.url === 'string' ? parsed.url : '';
        return { recipients, url };
    } catch {
        return empty;
    }
}

/**
 * Serializes structured notification fields into the canonical JSON string the
 * backend stores, based on the selected channel.
 */
export function buildNotificationConfig(
    channel: NotificationChannel,
    value: StructuredNotification
): string {
    if (channel === 'webhook') {
        return JSON.stringify({ url: value.url ?? '' });
    }
    // Default to email semantics.
    return JSON.stringify({ recipients: value.recipients ?? [] });
}

/** RFC-5322-lite email check, good enough for recipient chips. */
export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Accepts http(s) URLs for the webhook field. */
export function isValidHttpUrl(value: string): boolean {
    try {
        const u = new URL(value.trim());
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}
