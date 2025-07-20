import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

enum SchemaTypeEnum {
    Object = 'object',
    Array = 'array',
    String = 'string',
    Number = 'number',
    Boolean = 'boolean'
}

export interface SchemaField {
    key?: string; // UI only
    type: SchemaTypeEnum;
    description?: string;
    required?: boolean;
    properties?: Record<string, SchemaField>;
    items?: SchemaField;
}

@Component({
    selector: 'app-schema-node-editor',
    templateUrl: './schema-node-editor.component.html',
})
export class SchemaNodeEditorComponent implements OnInit {
    @Input() field!: SchemaField;
    @Input() key = "";
    @Input() depth = 0;
    @Output() remove = new EventEmitter<void>();
    @Output() keyChange = new EventEmitter<{ oldKey: string; newKey: string }>();

    oldKey: string = '';
    public isDescriptionFeatureEnabled: boolean = false;

    ngOnInit(): void {
        console.log(this.field)
        console.log(this.key)
        if (this.key !== "") {
            this.field.key = this.key;
        }

        if (this.field?.key) {
            this.oldKey = this.field.key;
        }

        if (this.field?.type === SchemaTypeEnum.Object && !this.field.properties) {
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
            required: false
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
        if (oldKey === newKey || !newKey.trim()) return;
        if (this.field.properties && this.field.properties[oldKey]) {
            const existing = this.field.properties[oldKey];
            existing.key = newKey;
            this.field.properties[newKey] = existing;
            delete this.field.properties[oldKey];
        }
    }
}
