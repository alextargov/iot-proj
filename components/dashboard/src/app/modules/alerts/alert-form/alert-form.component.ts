import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    FormArray,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatChipInputEvent } from '@angular/material/chips';
import {
    AlertService,
    AlertSeverity,
    AlertConditionOperator,
    CreateAlertRuleInput,
    UpdateAlertRuleInput,
} from '../../../shared/services/alert/alert.service';
import { DeviceService } from '../../../shared/services/device/device.service';
import { MetricsService } from '../../../shared/services/metrics/metrics.service';
import { DeviceInfoFragment } from '../../../shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import {
    TestResult,
    TestGroup,
    evaluateConditions,
    parseNotificationConfig,
    buildNotificationConfig,
    isValidEmail,
    isValidHttpUrl,
    StructuredNotification,
} from '../../../shared/utils/notification-config.utils';

/** Validates that a control's value is well-formed JSON (empty is allowed). */
export function jsonValidator(
    control: AbstractControl
): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
        return null;
    }
    try {
        JSON.parse(value);
        return null;
    } catch {
        return { json: true };
    }
}

@Component({
    selector: 'app-alert-form',
    templateUrl: './alert-form.component.html',
    styleUrls: ['./alert-form.component.scss'],
    standalone: false,
})
export class AlertFormComponent implements OnInit, HasUnsavedChanges {
    form: FormGroup;
    isEdit = false;
    alertId?: string;
    loading = false;
    saving = false;
    private submitted = false;
    devices: DeviceInfoFragment[] = [];
    metricNames: string[] = [];

    severities = Object.values(AlertSeverity);
    operators = Object.values(AlertConditionOperator);
    notificationTypes = ['email', 'webhook'];

    /** Chip-input separator key codes (Enter, comma). */
    readonly separatorKeysCodes: number[] = [13, 188];

    /** Result of the last "test against recent metrics" run, or null. */
    testResult: TestResult | null = null;
    testing = false;
    testError: string | null = null;

    constructor(
        private fb: FormBuilder,
        private alertService: AlertService,
        private deviceService: DeviceService,
        private metricsService: MetricsService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private toast: ToastrService
    ) {
        this.form = this.createForm();
    }

    public hasUnsavedChanges(): boolean {
        return this.form?.dirty && !this.submitted;
    }

    ngOnInit(): void {
        this.loadDevices();

        this.alertId = this.route.snapshot.params['id'];
        if (this.alertId) {
            this.isEdit = true;
            this.loadAlert();
        } else {
            const deviceId = this.route.snapshot.queryParams['deviceId'];
            if (deviceId) {
                this.form.patchValue({ deviceId });
            }
        }

        const deviceCtrl = this.form.get('deviceId');
        if (deviceCtrl) {
            deviceCtrl.valueChanges.subscribe((id: string) =>
                this.loadMetricNames(id)
            );
            if (deviceCtrl.value) {
                this.loadMetricNames(deviceCtrl.value);
            }
        }
    }

    private loadMetricNames(deviceId: string): void {
        if (!deviceId) {
            this.metricNames = [];
            return;
        }
        this.metricsService.getMetricsSeries(deviceId).subscribe({
            next: (series) => {
                this.metricNames = Array.from(
                    new Set(series.map((s) => s.metricName))
                ).sort();
                this.cdr.detectChanges();
            },
            error: () => {
                this.metricNames = [];
            },
        });
    }

    createForm(): FormGroup {
        return this.fb.group({
            deviceId: ['', Validators.required],
            name: ['', [Validators.required, Validators.maxLength(256)]],
            description: [''],
            severity: [AlertSeverity.WARNING],
            cooldownMinutes: [15, [Validators.required, Validators.min(1)]],
            conditionGroups: this.fb.array([this.createConditionGroup()]),
            notifications: this.fb.array([]),
        });
    }

    createConditionGroup(): FormGroup {
        return this.fb.group({
            conditions: this.fb.array([this.createCondition()]),
        });
    }

    createCondition(): FormGroup {
        return this.fb.group({
            metricName: ['', Validators.required],
            operator: [AlertConditionOperator.GT, Validators.required],
            threshold: [0, Validators.required],
        });
    }

    createNotification(
        type = 'email',
        structured: StructuredNotification = { recipients: [], url: '' }
    ): FormGroup {
        return this.fb.group({
            type: [type, Validators.required],
            // Structured fields drive the serialized config below.
            recipients: [structured.recipients],
            url: [structured.url],
            // Canonical config string sent to the backend; kept in sync with
            // the structured fields and editable via the "advanced" panel.
            config: [
                buildNotificationConfig(type, structured),
                [Validators.required, jsonValidator],
            ],
            showAdvanced: [false],
        });
    }

    get conditionGroups(): FormArray {
        return this.form.get('conditionGroups') as FormArray;
    }

    getConditions(groupIndex: number): FormArray {
        return this.conditionGroups.at(groupIndex).get('conditions') as FormArray;
    }

    get notifications(): FormArray {
        return this.form.get('notifications') as FormArray;
    }

    addConditionGroup(): void {
        this.conditionGroups.push(this.createConditionGroup());
    }

    removeConditionGroup(index: number): void {
        if (this.conditionGroups.length > 1) {
            this.conditionGroups.removeAt(index);
        }
    }

    addCondition(groupIndex: number): void {
        this.getConditions(groupIndex).push(this.createCondition());
    }

    removeCondition(groupIndex: number, condIndex: number): void {
        const conditions = this.getConditions(groupIndex);
        if (conditions.length > 1) {
            conditions.removeAt(condIndex);
        }
    }

    addNotification(): void {
        this.notifications.push(this.createNotification());
    }

    removeNotification(index: number): void {
        this.notifications.removeAt(index);
    }

    // --- Structured notification config -----------------------------------

    /** Re-serialize structured fields into the canonical config string. */
    private syncConfig(group: AbstractControl): void {
        const type = group.get('type')?.value;
        const structured: StructuredNotification = {
            recipients: group.get('recipients')?.value ?? [],
            url: group.get('url')?.value ?? '',
        };
        group
            .get('config')
            ?.setValue(buildNotificationConfig(type, structured));
        group.get('config')?.markAsDirty();
    }

    onChannelChange(index: number): void {
        this.syncConfig(this.notifications.at(index));
    }

    addRecipient(index: number, event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        const group = this.notifications.at(index);
        if (value && isValidEmail(value)) {
            const current: string[] = group.get('recipients')?.value ?? [];
            if (!current.includes(value)) {
                group.get('recipients')?.setValue([...current, value]);
                this.syncConfig(group);
            }
        }
        event.chipInput?.clear();
    }

    removeRecipient(index: number, recipient: string): void {
        const group = this.notifications.at(index);
        const current: string[] = group.get('recipients')?.value ?? [];
        group
            .get('recipients')
            ?.setValue(current.filter((r) => r !== recipient));
        this.syncConfig(group);
    }

    onWebhookUrlChange(index: number): void {
        this.syncConfig(this.notifications.at(index));
    }

    /** Parse an edited raw-JSON config back into the structured fields. */
    onRawConfigChange(index: number): void {
        const group = this.notifications.at(index);
        const structured = parseNotificationConfig(group.get('config')?.value);
        group.get('recipients')?.setValue(structured.recipients);
        group.get('url')?.setValue(structured.url);
    }

    toggleAdvanced(index: number): void {
        const ctrl = this.notifications.at(index).get('showAdvanced');
        ctrl?.setValue(!ctrl.value);
    }

    public isValidEmail = isValidEmail;
    public isValidHttpUrl = isValidHttpUrl;

    loadDevices(): void {
        this.deviceService.getAllDevices().subscribe({
            next: (devices) => {
                this.devices = devices;
            },
            error: (err) => {
                console.error('Failed to load devices:', err);
            },
        });
    }

    loadAlert(): void {
        if (!this.alertId) return;

        this.loading = true;
        this.alertService.getAlertRule(this.alertId).subscribe({
            next: (alert) => {
                if (alert) {
                    this.populateForm(alert);
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load alert:', err);
                this.loading = false;
            },
        });
    }

    populateForm(alert: any): void {
        // Clear existing arrays
        while (this.conditionGroups.length) {
            this.conditionGroups.removeAt(0);
        }
        while (this.notifications.length) {
            this.notifications.removeAt(0);
        }

        // Populate basic fields
        this.form.patchValue({
            deviceId: alert.device?.id || '',
            name: alert.name,
            description: alert.description || '',
            severity: alert.severity,
            cooldownMinutes: alert.cooldownMinutes,
        });

        // Populate condition groups
        if (alert.conditions && alert.conditions.length > 0) {
            alert.conditions.forEach((group: any) => {
                const groupForm = this.fb.group({
                    conditions: this.fb.array([]),
                });
                const conditionsArray = groupForm.get('conditions') as FormArray;

                group.conditions.forEach((cond: any) => {
                    conditionsArray.push(
                        this.fb.group({
                            metricName: [cond.metricName, Validators.required],
                            operator: [cond.operator, Validators.required],
                            threshold: [cond.threshold, Validators.required],
                        })
                    );
                });

                this.conditionGroups.push(groupForm);
            });
        } else {
            this.conditionGroups.push(this.createConditionGroup());
        }

        // Populate notifications
        if (alert.notifications) {
            alert.notifications.forEach((notif: any) => {
                const structured = parseNotificationConfig(notif.config);
                const group = this.createNotification(notif.type, structured);
                // Preserve the stored config verbatim (may contain keys the
                // structured UI doesn't model).
                group.get('config')?.setValue(notif.config);
                this.notifications.push(group);
            });
        }
    }

    getOperatorDisplay(operator: AlertConditionOperator): string {
        return this.alertService.getOperatorDisplay(operator);
    }

    /** Operator symbol from a raw string value (for the test breakdown). */
    operatorSymbol(operator: string): string {
        return this.alertService.getOperatorDisplay(operator as AlertConditionOperator);
    }

    private operatorPhrase(op: AlertConditionOperator): string {
        switch (op) {
            case AlertConditionOperator.GT:
                return 'is above';
            case AlertConditionOperator.LT:
                return 'is below';
            case AlertConditionOperator.GTE:
                return 'is at least';
            case AlertConditionOperator.LTE:
                return 'is at most';
            case AlertConditionOperator.EQ:
                return 'equals';
            default:
                return this.getOperatorDisplay(op);
        }
    }

    /** Human-readable one-liner describing when the alert fires. */
    get summary(): string {
        if (!this.form) {
            return '';
        }
        const raw = this.form.value;
        const deviceName =
            this.devices.find((d) => d.id === raw.deviceId)?.name ?? 'a device';

        const groupPhrases: string[] = (raw.conditionGroups ?? [])
            .map((g: any) =>
                (g.conditions ?? [])
                    .filter((c: any) => c.metricName)
                    .map(
                        (c: any) =>
                            `${c.metricName} ${this.operatorPhrase(c.operator)} ${c.threshold}`
                    )
                    .join(' AND ')
            )
            .filter((p: string) => p.length > 0);

        const when = groupPhrases.length
            ? groupPhrases.map((p: string) => `(${p})`).join(' OR ')
            : 'a condition is met';

        const count = (raw.notifications ?? []).length;
        const notify = count
            ? `send ${count} notification${count > 1 ? 's' : ''}`
            : 'record an event';

        return `Raise a ${raw.severity ?? ''} alert and ${notify} when ${deviceName}'s ${when}.`;
    }

    // --- Test against recent metrics --------------------------------------

    /** Current condition groups as plain objects for the evaluator. */
    private currentGroups(): TestGroup[] {
        const raw = this.form.value;
        return (raw.conditionGroups ?? []).map((g: any) => ({
            conditions: (g.conditions ?? []).map((c: any) => ({
                metricName: c.metricName,
                operator: c.operator,
                threshold: Number(c.threshold),
            })),
        }));
    }

    runTest(): void {
        const deviceId = this.form.get('deviceId')?.value;
        if (!deviceId) {
            this.testError = 'Select a device first.';
            this.testResult = null;
            return;
        }
        this.testing = true;
        this.testError = null;
        this.testResult = null;

        // Pull a recent window of metrics and keep the latest value per name.
        this.metricsService.getMetrics(deviceId, { limit: 200 }).subscribe({
            next: (metrics) => {
                const latest = new Map<string, number>();
                // getMetrics returns rows; keep the most recent per metricName.
                const sorted = [...metrics].sort(
                    (a, b) =>
                        new Date(b.recordedAt).getTime() -
                        new Date(a.recordedAt).getTime()
                );
                for (const m of sorted) {
                    if (!latest.has(m.metricName)) {
                        latest.set(m.metricName, m.metricValue);
                    }
                }
                this.testResult = evaluateConditions(this.currentGroups(), latest);
                this.testing = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.testError = 'Could not load recent metrics for this device.';
                this.testing = false;
                this.cdr.detectChanges();
            },
        });
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving = true;
        const formValue = this.form.value;

        // Notifications carry structured helper fields in the form; the backend
        // only wants { type, config }.
        const notifications = (formValue.notifications ?? []).map((n: any) => ({
            type: n.type,
            config: n.config,
        }));

        // Build conditions array
        const conditions: any[] = [];
        formValue.conditionGroups.forEach((group: any, groupIndex: number) => {
            group.conditions.forEach((cond: any) => {
                conditions.push({
                    groupId: groupIndex,
                    metricName: cond.metricName,
                    operator: cond.operator,
                    threshold: cond.threshold,
                });
            });
        });

        if (this.isEdit && this.alertId) {
            const input: UpdateAlertRuleInput = {
                name: formValue.name,
                description: formValue.description || undefined,
                severity: formValue.severity,
                cooldownMinutes: formValue.cooldownMinutes,
                conditions,
                notifications,
            };

            this.alertService.updateAlertRule(this.alertId, input).subscribe({
                next: () => {
                    this.saving = false;
                    this.submitted = true;
                    this.toast.showSuccess('Alert rule updated');
                    this.router.navigate(['/alerts']);
                },
                error: (err) => {
                    console.error('Failed to update alert:', err);
                    this.saving = false;
                    this.toast.showError('Failed to update alert');
                },
            });
        } else {
            const input: CreateAlertRuleInput = {
                deviceId: formValue.deviceId,
                name: formValue.name,
                description: formValue.description || undefined,
                severity: formValue.severity,
                cooldownMinutes: formValue.cooldownMinutes,
                conditions,
                notifications,
            };

            this.alertService.createAlertRule(input).subscribe({
                next: () => {
                    this.saving = false;
                    this.submitted = true;
                    this.toast.showSuccess('Alert rule created');
                    this.router.navigate(['/alerts']);
                },
                error: (err) => {
                    console.error('Failed to create alert:', err);
                    this.saving = false;
                    this.toast.showError('Failed to create alert');
                },
            });
        }
    }

    cancel(): void {
        this.router.navigate(['/alerts']);
    }
}
