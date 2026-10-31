import { Component, Inject } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import {
    DeviceInfoFragment,
    DeviceStatus,
    UpdateDeviceInput,
} from '../../../shared/graphql/generated';

export interface DeviceEditDialogData {
    device: DeviceInfoFragment;
}

/**
 * Lightweight edit dialog for the mutable device metadata (name, description,
 * host endpoints, tags, status). Auth credentials and the data model are
 * intentionally left to the create wizard — this dialog backs the devices-list
 * "Edit" action with the already-implemented `updateDevice` mutation.
 */
@Component({
    standalone: false,
    selector: 'app-device-edit-dialog',
    templateUrl: './device-edit-dialog.component.html',
    styleUrls: ['./device-edit-dialog.component.scss'],
})
export class DeviceEditDialogComponent {
    public readonly form: FormGroup;
    public readonly statuses = Object.values(DeviceStatus);
    public tags: string[] = [];

    public readonly separatorKeysCodes = [ENTER, COMMA] as const;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<
            DeviceEditDialogComponent,
            UpdateDeviceInput | undefined
        >,
        @Inject(MAT_DIALOG_DATA) public data: DeviceEditDialogData
    ) {
        const device = data.device;
        this.tags = device.tags ? [...device.tags] : [];
        this.form = this.fb.group({
            name: [device.name, [Validators.required, Validators.maxLength(255)]],
            description: [device.description ?? ''],
            status: [device.status, Validators.required],
            url: [device.host?.url ?? ''],
            turnOnEndpoint: [device.host?.turnOnEndpoint ?? ''],
            turnOffEndpoint: [device.host?.turnOffEndpoint ?? ''],
        });
    }

    public addTag(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        if (value && !this.tags.includes(value)) {
            this.tags.push(value);
        }
        event.chipInput?.clear();
        this.form.markAsDirty();
    }

    public removeTag(tag: string): void {
        const index = this.tags.indexOf(tag);
        if (index >= 0) {
            this.tags.splice(index, 1);
            this.form.markAsDirty();
        }
    }

    public cancel(): void {
        this.dialogRef.close(undefined);
    }

    public save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const url = (raw.url || '').trim();

        // Only send a host object when a URL is present; the backend treats a
        // null host as "no endpoint configured".
        const host = url
            ? {
                  url,
                  turnOnEndpoint: (raw.turnOnEndpoint || '').trim() || null,
                  turnOffEndpoint: (raw.turnOffEndpoint || '').trim() || null,
              }
            : null;

        const input: UpdateDeviceInput = {
            name: raw.name.trim(),
            description: (raw.description || '').trim() || null,
            status: raw.status,
            host,
            tags: this.tags.length ? this.tags : [],
        };

        this.dialogRef.close(input);
    }
}
