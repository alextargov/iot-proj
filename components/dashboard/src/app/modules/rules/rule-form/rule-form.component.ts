import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormGroup,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatChipInputEvent } from '@angular/material/chips';
import { RuleService } from '../../../shared/services/rule/rule.service';
import { DeviceService } from '../../../shared/services/device/device.service';
import { IntegrationService } from '../../../shared/services/integration/integration.service';
import { MetricsService } from '../../../shared/services/metrics/metrics.service';
import {
    RuleActionType,
    RuleConditionOperator,
    OperationType,
    CreateAutomationRuleInput,
    RuleActionInput,
    RuleConditionInput,
    DeviceInfoFragment,
    IntegrationInfoFragment,
} from '../../../shared/graphql/generated';
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
    selector: 'app-rule-form',
    templateUrl: './rule-form.component.html',
    styleUrls: ['./rule-form.component.scss'],
    standalone: false,
})
export class RuleFormComponent implements OnInit, HasUnsavedChanges {
    form!: FormGroup;
    devices: DeviceInfoFragment[] = [];
    integrations: IntegrationInfoFragment[] = [];
    metricNames: string[] = [];
    editingId: string | null = null;
    saving = false;
    private submitted = false;

    /** Chip-input separator key codes (Enter, comma). */
    readonly separatorKeysCodes: number[] = [13, 188];

    /** Result of the last "test against recent metrics" run, or null. */
    testResult: TestResult | null = null;
    testing = false;
    testError: string | null = null;

    public isValidEmail = isValidEmail;
    public isValidHttpUrl = isValidHttpUrl;

    readonly operators = Object.values(RuleConditionOperator);
    readonly actionTypes = Object.values(RuleActionType);
    readonly operations = Object.values(OperationType).filter(
        (o) => o === OperationType.TurnOn || o === OperationType.TurnOff
    );

    // Expose enum to the template.
    readonly RuleActionType = RuleActionType;

    constructor(
        private fb: FormBuilder,
        private ruleService: RuleService,
        private deviceService: DeviceService,
        private integrationService: IntegrationService,
        private metricsService: MetricsService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private toast: ToastrService
    ) {}

    public hasUnsavedChanges(): boolean {
        return this.form?.dirty && !this.submitted;
    }

    ngOnInit(): void {
        this.form = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            deviceId: ['', Validators.required],
            cooldownSeconds: [60, [Validators.required, Validators.min(0)]],
            groups: this.fb.array([this.newGroup()]),
            actions: this.fb.array([]),
        });

        this.deviceService.getAllDevices().subscribe((devices) => {
            this.devices = devices;
            this.cdr.detectChanges();
        });

        this.integrationService.list().subscribe((integrations) => {
            this.integrations = integrations;
            this.cdr.detectChanges();
        });

        this.editingId = this.route.snapshot.paramMap.get('id');
        if (this.editingId) {
            this.loadRule(this.editingId);
        }

        // Populate metric-name suggestions whenever the target device changes.
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

    // ---- Condition groups ----

    get groups(): FormArray {
        return this.form.get('groups') as FormArray;
    }

    conditions(groupIndex: number): FormArray {
        return this.groups.at(groupIndex).get('conditions') as FormArray;
    }

    newGroup(): FormGroup {
        return this.fb.group({
            conditions: this.fb.array([this.newCondition()]),
        });
    }

    newCondition(): FormGroup {
        return this.fb.group({
            metricName: ['', Validators.required],
            operator: [RuleConditionOperator.Gt, Validators.required],
            threshold: [0, Validators.required],
        });
    }

    addGroup(): void {
        this.groups.push(this.newGroup());
    }

    removeGroup(i: number): void {
        this.groups.removeAt(i);
    }

    addCondition(groupIndex: number): void {
        this.conditions(groupIndex).push(this.newCondition());
    }

    removeCondition(groupIndex: number, condIndex: number): void {
        this.conditions(groupIndex).removeAt(condIndex);
    }

    // ---- Actions ----

    get actions(): FormArray {
        return this.form.get('actions') as FormArray;
    }

    newAction(type: RuleActionType = RuleActionType.DeviceOperation): FormGroup {
        return this.fb.group({
            type: [type, Validators.required],
            targetDeviceId: [''],
            operation: [OperationType.TurnOn],
            notificationType: ['email'],
            // Structured notification fields drive notificationConfig below.
            recipients: [[] as string[]],
            url: [''],
            notificationConfig: ['{"recipients":[]}', jsonValidator],
            showAdvanced: [false],
            integrationId: [''],
            delaySeconds: [5],
        });
    }

    addAction(): void {
        this.actions.push(this.newAction());
    }

    removeAction(i: number): void {
        this.actions.removeAt(i);
    }

    moveAction(i: number, dir: -1 | 1): void {
        const target = i + dir;
        if (target < 0 || target >= this.actions.length) {
            return;
        }
        const ctrl = this.actions.at(i);
        this.actions.removeAt(i);
        this.actions.insert(target, ctrl);
    }

    // ---- Structured notification config ----

    private syncConfig(group: AbstractControl): void {
        const channel = group.get('notificationType')?.value;
        const structured: StructuredNotification = {
            recipients: group.get('recipients')?.value ?? [],
            url: group.get('url')?.value ?? '',
        };
        group
            .get('notificationConfig')
            ?.setValue(buildNotificationConfig(channel, structured));
        group.get('notificationConfig')?.markAsDirty();
    }

    onChannelChange(index: number): void {
        this.syncConfig(this.actions.at(index));
    }

    addRecipient(index: number, event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        const group = this.actions.at(index);
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
        const group = this.actions.at(index);
        const current: string[] = group.get('recipients')?.value ?? [];
        group
            .get('recipients')
            ?.setValue(current.filter((r) => r !== recipient));
        this.syncConfig(group);
    }

    onWebhookUrlChange(index: number): void {
        this.syncConfig(this.actions.at(index));
    }

    onRawConfigChange(index: number): void {
        const group = this.actions.at(index);
        const structured = parseNotificationConfig(
            group.get('notificationConfig')?.value
        );
        group.get('recipients')?.setValue(structured.recipients);
        group.get('url')?.setValue(structured.url);
    }

    toggleAdvanced(index: number): void {
        const ctrl = this.actions.at(index).get('showAdvanced');
        ctrl?.setValue(!ctrl.value);
    }

    // ---- Test against recent metrics ----

    private currentGroups(): TestGroup[] {
        const raw = this.form.getRawValue();
        return (raw.groups ?? []).map((g: any) => ({
            conditions: (g.conditions ?? []).map((c: any) => ({
                metricName: c.metricName,
                operator: c.operator,
                threshold: Number(c.threshold),
            })),
        }));
    }

    operatorSymbol(op: string): string {
        switch (op) {
            case 'GT':
                return '>';
            case 'LT':
                return '<';
            case 'GTE':
                return '>=';
            case 'LTE':
                return '<=';
            case 'EQ':
                return '=';
            case 'NE':
                return '!=';
            default:
                return op;
        }
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

        this.metricsService.getMetrics(deviceId, { limit: 200 }).subscribe({
            next: (metrics) => {
                const latest = new Map<string, number>();
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

    // ---- Plain-English summary ----

    private operatorPhrase(op: string): string {
        switch (op) {
            case RuleConditionOperator.Gt:
                return 'is above';
            case RuleConditionOperator.Lt:
                return 'is below';
            case RuleConditionOperator.Gte:
                return 'is at least';
            case RuleConditionOperator.Lte:
                return 'is at most';
            case RuleConditionOperator.Eq:
                return 'equals';
            case RuleConditionOperator.Ne:
                return 'is not';
            default:
                return op;
        }
    }

    private actionPhrase(a: any): string {
        switch (a.type) {
            case RuleActionType.DeviceOperation: {
                const op = a.operation === OperationType.TurnOff ? 'turn off' : 'turn on';
                const target = a.targetDeviceId
                    ? this.devices.find((d) => d.id === a.targetDeviceId)?.name ??
                      'the target device'
                    : 'the device';
                return `${op} ${target}`;
            }
            case RuleActionType.Notification:
                return `send a ${a.notificationType || 'notification'}`;
            case RuleActionType.Delay:
                return `wait ${a.delaySeconds ?? 0}s`;
            case RuleActionType.Integration: {
                const name = this.integrations.find(
                    (i) => i.id === a.integrationId
                )?.name;
                return name ? `call the "${name}" integration` : 'call an integration';
            }
            default:
                return String(a.type);
        }
    }

    /** Human-readable one-liner describing what the rule does. */
    get summary(): string {
        if (!this.form) {
            return '';
        }
        const raw = this.form.getRawValue();
        const deviceName =
            this.devices.find((d) => d.id === raw.deviceId)?.name ?? 'a device';

        const groupPhrases: string[] = (raw.groups ?? [])
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

        const actionPhrases: string[] = (raw.actions ?? []).map((a: any) =>
            this.actionPhrase(a)
        );
        const then = actionPhrases.length
            ? actionPhrases.join(', then ')
            : 'do nothing yet';

        return `When ${deviceName}'s ${when}, ${then}.`;
    }

    // ---- Load / save ----

    private loadRule(id: string): void {
        this.ruleService.getRule(id).subscribe((rule) => {
            if (!rule) {
                return;
            }
            this.form.patchValue({
                name: rule.name,
                description: rule.description ?? '',
                deviceId: rule.device?.id,
                cooldownSeconds: rule.cooldownSeconds,
            });

            this.groups.clear();
            for (const g of rule.conditions) {
                const condArray = this.fb.array(
                    g.conditions.map((c) =>
                        this.fb.group({
                            metricName: [c.metricName, Validators.required],
                            operator: [c.operator, Validators.required],
                            threshold: [c.threshold, Validators.required],
                        })
                    )
                );
                this.groups.push(this.fb.group({ conditions: condArray }));
            }

            this.actions.clear();
            for (const a of rule.actions) {
                const structured = parseNotificationConfig(a.notificationConfig);
                this.actions.push(
                    this.fb.group({
                        type: [a.type, Validators.required],
                        targetDeviceId: [a.targetDeviceId ?? ''],
                        operation: [a.operation ?? OperationType.TurnOn],
                        notificationType: [a.notificationType ?? 'email'],
                        recipients: [structured.recipients],
                        url: [structured.url],
                        notificationConfig: [
                            a.notificationConfig ?? '{}',
                            jsonValidator,
                        ],
                        showAdvanced: [false],
                        integrationId: [a.integrationId ?? ''],
                        delaySeconds: [a.delaySeconds ?? 5],
                    })
                );
            }

            this.cdr.detectChanges();
        });
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.saving = true;

        const raw = this.form.getRawValue();

        const conditions: RuleConditionInput[] = [];
        raw.groups.forEach((group: any, groupId: number) => {
            group.conditions.forEach((c: any) => {
                conditions.push({
                    groupId,
                    metricName: c.metricName,
                    operator: c.operator,
                    threshold: Number(c.threshold),
                });
            });
        });

        const actions: RuleActionInput[] = raw.actions.map(
            (a: any, index: number): RuleActionInput => {
                const base: RuleActionInput = { seqOrder: index, type: a.type };
                if (a.type === RuleActionType.DeviceOperation) {
                    base.operation = a.operation;
                    if (a.targetDeviceId) {
                        base.targetDeviceId = a.targetDeviceId;
                    }
                } else if (a.type === RuleActionType.Notification) {
                    base.notificationType = a.notificationType;
                    base.notificationConfig = a.notificationConfig;
                } else if (a.type === RuleActionType.Delay) {
                    base.delaySeconds = Number(a.delaySeconds);
                } else if (a.type === RuleActionType.Integration) {
                    if (a.integrationId) {
                        base.integrationId = a.integrationId;
                    }
                }
                return base;
            }
        );

        if (this.editingId) {
            this.ruleService
                .updateRule(this.editingId, {
                    name: raw.name,
                    description: raw.description,
                    cooldownSeconds: Number(raw.cooldownSeconds),
                    conditions,
                    actions,
                })
                .subscribe({
                    next: () => {
                        this.submitted = true;
                        this.toast.showSuccess('Rule updated');
                        this.router.navigate(['/rules']);
                    },
                    error: () => {
                        this.saving = false;
                        this.toast.showError('Failed to update rule');
                    },
                });
        } else {
            const input: CreateAutomationRuleInput = {
                deviceId: raw.deviceId,
                name: raw.name,
                description: raw.description,
                cooldownSeconds: Number(raw.cooldownSeconds),
                conditions,
                actions,
            };
            this.ruleService.createRule(input).subscribe({
                next: () => {
                    this.submitted = true;
                    this.toast.showSuccess('Rule created');
                    this.router.navigate(['/rules']);
                },
                error: () => {
                    this.saving = false;
                    this.toast.showError('Failed to create rule');
                },
            });
        }
    }

    cancel(): void {
        this.router.navigate(['/rules']);
    }
}
