import { nextRun, parseCron } from './cron.utils';

describe('cron.utils', () => {
    describe('parseCron step handling', () => {
        it('expands a bare "N/step" as N..max by step', () => {
            // `5/15` in a minute field must mean 5,20,35,50 — not just {5}.
            const fields = parseCron('5/15 * * * *');
            expect([...fields.minutes].sort((a, b) => a - b)).toEqual([5, 20, 35, 50]);
        });

        it('expands "*/n" from the field minimum', () => {
            const fields = parseCron('*/15 * * * *');
            expect([...fields.minutes].sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
        });

        it('expands "a-b/step" within the explicit range', () => {
            const fields = parseCron('0-30/10 * * * *');
            expect([...fields.minutes].sort((a, b) => a - b)).toEqual([0, 10, 20, 30]);
        });

        it('treats a plain number as a single value', () => {
            const fields = parseCron('5 * * * *');
            expect([...fields.minutes]).toEqual([5]);
        });
    });

    describe('nextRun', () => {
        it('fires at the right minutes for "5/15"', () => {
            // From 00:00, next minute matching {5,20,35,50} is 00:05.
            const from = new Date(2026, 0, 1, 0, 0, 0, 0);
            const next = nextRun('5/15 * * * *', from);
            expect(next?.getMinutes()).toBe(5);

            // From 00:06, the next match is 00:20.
            const next2 = nextRun('5/15 * * * *', new Date(2026, 0, 1, 0, 6, 0, 0));
            expect(next2?.getMinutes()).toBe(20);
        });

        it('returns null for an unsatisfiable schedule', () => {
            // Feb 30th never exists.
            expect(nextRun('0 0 30 2 *')).toBeNull();
        });

        it('returns null for invalid expressions', () => {
            expect(nextRun('not a cron')).toBeNull();
            expect(nextRun('* * *')).toBeNull();
        });
    });
});
