import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    AlertService,
    AlertSeverity,
    AlertConditionOperator,
    CreateAlertRuleInput,
    UpdateAlertRuleInput,
} from '../../../shared/services/alert/alert.service';
import { DeviceService } from '../../../shared/services/device/device.service';
import { DeviceInfoFragment } from '../../../shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';

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

    severities = Object.values(AlertSeverity);
    operators = Object.values(AlertConditionOperator);
    notificationTypes = ['email', 'webhook'];

    constructor(
        private fb: FormBuilder,
        private alertService: AlertService,
        private deviceService: DeviceService,
        private route: ActivatedRoute,
        private router: Router,
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

    createNotification(): FormGroup {
        return this.fb.group({
            type: ['email', Validators.required],
            config: ['', Validators.required],
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
                this.notifications.push(
                    this.fb.group({
                        type: [notif.type, Validators.required],
                        config: [notif.config, Validators.required],
                    })
                );
            });
        }
    }

    getOperatorDisplay(operator: AlertConditionOperator): string {
        return this.alertService.getOperatorDisplay(operator);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving = true;
        const formValue = this.form.value;

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
                notifications: formValue.notifications,
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
                notifications: formValue.notifications,
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
