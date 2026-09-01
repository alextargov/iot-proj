import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

enum SchemaTypeEnum {
    Object = 'object',
    Array = 'array',
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
}

export interface SchemaField {
    key?: string; // UI only
    keyError?: string; // UI only — validation message for the key input
    type: SchemaTypeEnum;
    description?: string;
    required?: boolean;
    properties?: Record<string, SchemaField>;
    items?: SchemaField;
}

@Component({
    standalone: false,
    selector: 'app-schema-node-editor',
    templateUrl: './schema-node-editor.component.html',
})
export class SchemaNodeEditorComponent implements OnInit {
    @Input() field!: SchemaField;
    @Input() key = '';
    @Input() depth = 0;
    @Input() parentType: 'object' | 'array' | null = null;
    @Input() isReadOnly = false;

    @Output() remove = new EventEmitter<void>();
    @Output() keyChange = new EventEmitter<{
        oldKey: string;
        newKey: string;
    }>();

    oldKey: string = '';
    public isDescriptionFeatureEnabled: boolean = false;

    ngOnInit(): void {
        if (this.key !== '') {
            this.field.key = this.key;
        }

        if (this.field?.key) {
            this.oldKey = this.field.key;
        }

        if (
            this.field?.type === SchemaTypeEnum.Object &&
            !this.field.properties
        ) {
            this.field.properties = {};
        }

        if (this.field?.type === SchemaTypeEnum.Array && !this.field.items) {
            this.field.items = {
                type: SchemaTypeEnum.String, // Default item type
            };
        }
    }

    addProperty(): void {
        if (!this.field.properties) this.field.properties = {};
        const newKey = this.generateUniqueKey();
        this.field.properties[newKey] = {
            key: newKey,
            type: SchemaTypeEnum.String,
            description: '',
            required: false,
        };
    }

    generateUniqueKey(): string {
        const base = 'property';
        let count = 1;
        let key = `${base}${count}`;
        while (this.field.properties && this.field.properties[key]) {
            key = `${base}${++count}`;
        }
        return key;
    }

    removeProperty(key: string): void {
        delete this.field.properties?.[key];
    }

    onKeyChange(oldKey: string, newKey: string): void {
        const props = this.field.properties;
        if (!props) return;

        // Locate the entry being edited. Prefer oldKey, but fall back to
        // identity so a stale oldKey (after a prior rename) still resolves.
        let currentKey = props[oldKey] ? oldKey : undefined;
        if (!currentKey) {
            currentKey = Object.keys(props).find((k) => props[k].key === newKey);
        }
        if (!currentKey) return;
        const existing = props[currentKey];

        const trimmed = (newKey ?? '').trim();

        // Empty key — flag but don't drop the entry.
        if (!trimmed) {
            existing.keyError = 'Key is required';
            return;
        }

        // Duplicate key among siblings — flag and keep the entry under its
        // current key so nothing is silently overwritten.
        const clashes = Object.keys(props).some(
            (k) => k !== currentKey && k === trimmed
        );
        if (clashes) {
            existing.keyError = `"${trimmed}" is already used`;
            return;
        }

        existing.keyError = undefined;

        if (currentKey === trimmed) {
            existing.key = trimmed;
            return;
        }

        existing.key = trimmed;
        props[trimmed] = existing;
        delete props[currentKey];
    }

    onTypeChange(): void {
        if (this.field.type === SchemaTypeEnum.Object) {
            this.field.properties = {};
            delete this.field.items;
        } else if (this.field.type === SchemaTypeEnum.Array) {
            this.field.items = { type: SchemaTypeEnum.String }; // Default item type
            delete this.field.properties;
        } else {
            delete this.field.properties;
            delete this.field.items;
        }
    }
}
