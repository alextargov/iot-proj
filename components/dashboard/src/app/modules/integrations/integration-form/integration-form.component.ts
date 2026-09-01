import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IntegrationService } from '../../../shared/services/integration/integration.service';
import {
    IntegrationType,
    CreateIntegrationInput,
} from '../../../shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';

/** Validates that a control's value is a valid URL (http/https) when non-empty. */
function urlValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value ?? '').trim();
    if (!value) {
        return null;
    }
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:'
            ? null
            : { url: true };
    } catch {
        return { url: true };
    }
}

/** Validates that a control's value is parseable JSON when non-empty. */
function jsonValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value ?? '').trim();
    if (!value) {
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
    selector: 'app-integration-form',
    templateUrl: './integration-form.component.html',
    styleUrls: ['./integration-form.component.scss'],
    standalone: false,
})
export class IntegrationFormComponent implements OnInit, HasUnsavedChanges {
    form!: FormGroup;
    editingId: string | null = null;
    saving = false;
    testing = false;
    testResult: 'ok' | 'fail' | null = null;
    lastTestedAt: Date | null = null;
    private submitted = false;
    readonly types = Object.values(IntegrationType);

    constructor(
        private fb: FormBuilder,
        private service: IntegrationService,
        private route: ActivatedRoute,
        private router: Router,
        private toast: ToastrService
    ) {}

    public hasUnsavedChanges(): boolean {
        return this.form?.dirty && !this.submitted;
    }

    ngOnInit(): void {
        this.form = this.fb.group({
            name: ['', Validators.required],
            type: [IntegrationType.Webhook, Validators.required],
            endpoint: ['', [Validators.required, urlValidator]],
            authToken: [''],
            config: ['', jsonValidator],
            enabled: [true],
        });

        this.editingId = this.route.snapshot.paramMap.get('id');
        if (this.editingId) {
            this.service.get(this.editingId).subscribe((i) => {
                if (i) {
                    this.form.patchValue({
                        name: i.name,
                        type: i.type,
                        endpoint: i.endpoint,
                        authToken: '',
                        config: i.config ?? '',
                        enabled: i.enabled,
                    });
                    // Type can't change after creation.
                    this.form.get('type')?.disable();
                }
            });
        }
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.saving = true;
        const raw = this.form.getRawValue();

        if (this.editingId) {
            this.service
                .update(this.editingId, {
                    name: raw.name,
                    endpoint: raw.endpoint,
                    authToken: raw.authToken || undefined,
                    config: raw.config || undefined,
                    enabled: raw.enabled,
                })
                .subscribe({
                    next: () => {
                        this.submitted = true;
                        this.toast.showSuccess('Integration updated');
                        this.router.navigate(['/integrations']);
                    },
                    error: () => {
                        this.saving = false;
                        this.toast.showError('Failed to update integration');
                    },
                });
        } else {
            const input: CreateIntegrationInput = {
                name: raw.name,
                type: raw.type,
                endpoint: raw.endpoint,
                authToken: raw.authToken || undefined,
                config: raw.config || undefined,
            };
            this.service.create(input).subscribe({
                next: () => {
                    this.submitted = true;
                    this.toast.showSuccess('Integration created');
                    this.router.navigate(['/integrations']);
                },
                error: () => {
                    this.saving = false;
                    this.toast.showError('Failed to create integration');
                },
            });
        }
    }

    cancel(): void {
        this.router.navigate(['/integrations']);
    }

    /**
     * Tests the saved integration. Only available in edit mode — `test` runs
     * against the persisted record, not the unsaved form values.
     */
    testConnection(): void {
        if (!this.editingId) {
            return;
        }
        this.testing = true;
        this.testResult = null;
        this.service.test(this.editingId).subscribe({
            next: (ok) => {
                this.testing = false;
                this.testResult = ok ? 'ok' : 'fail';
                this.lastTestedAt = new Date();
                if (ok) {
                    this.toast.showSuccess('Connection test succeeded');
                } else {
                    this.toast.showWarning('Connection test failed');
                }
            },
            error: () => {
                this.testing = false;
                this.testResult = 'fail';
                this.lastTestedAt = new Date();
                this.toast.showError('Connection test could not run');
            },
        });
    }
}
