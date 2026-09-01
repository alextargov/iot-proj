import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IntegrationService } from '../../../shared/services/integration/integration.service';
import {
    IntegrationType,
    CreateIntegrationInput,
} from '../../../shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';

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
            endpoint: ['', Validators.required],
            authToken: [''],
            config: [''],
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
}
