import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

export interface DeviceMetadataFormValue {
  name: string;
  description: string;
  deviceURL: string;
  turnOnEndpoint: string;
  turnOffEndpoint: string;
  tags: string[];
}

@Component({
  standalone: false,
  selector: 'app-device-metadata-form',
  templateUrl: './device-metadata-form.component.html',
  styleUrls: ['./device-metadata-form.component.scss'],
})
export class DeviceMetadataFormComponent implements OnInit {
  @Input() initialData?: Partial<DeviceMetadataFormValue>;
  @Output() formReady = new EventEmitter<UntypedFormGroup>();
  @Output() testConnection = new EventEmitter<string>();

  public form: UntypedFormGroup;
  public tags: string[] = [];
  public readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  public isTestingConnection = false;

  constructor(private fb: UntypedFormBuilder) {}

  ngOnInit(): void {
    this.tags = this.initialData?.tags ? [...this.initialData.tags] : [];

    this.form = this.fb.group({
      name: [this.initialData?.name || '', [Validators.required, Validators.maxLength(128)]],
      description: [this.initialData?.description || '', [Validators.required, Validators.maxLength(512)]],
      deviceURL: [this.initialData?.deviceURL || ''],
      turnOnEndpoint: [this.initialData?.turnOnEndpoint || ''],
      turnOffEndpoint: [this.initialData?.turnOffEndpoint || ''],
    });

    this.formReady.emit(this.form);
  }

  public addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim().toLowerCase();
    if (value && !this.tags.includes(value)) {
      this.tags.push(value);
    }
    event.chipInput!.clear();
  }

  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  public onTestConnectionClick(): void {
    const url = this.form.get('deviceURL')?.value;
    if (url) {
      this.testConnection.emit(url);
    }
  }

  public getTags(): string[] {
    return this.tags;
  }

  public getValue(): DeviceMetadataFormValue {
    return {
      ...this.form.value,
      tags: this.tags,
    };
  }

  public reset(): void {
    this.form.reset();
    this.tags = [];
  }
}
