export interface SchedulePreset {
    label: string;
    value: string;
    description: string;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
    { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
    { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
    { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
    { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
    { label: 'Every day at 8am', value: '0 8 * * *', description: 'Runs daily at 8:00 AM' },
    { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs daily at midnight' },
    { label: 'Every Monday at 9am', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
    { label: 'Custom', value: 'custom', description: 'Enter a custom cron expression' },
];

export function formatSchedule(schedule: string | null | undefined): string {
    if (!schedule) return 'Manual';
    const preset = SCHEDULE_PRESETS.find(p => p.value === schedule);
    return preset ? preset.label : schedule;
}
