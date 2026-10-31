import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

enum SchemaTypeEnum {
    Object = 'object',
    Array = 'array',
    String = 'string',
    Number = 'number',
    Integer = 'integer',
    Boolean = 'boolean',
}

export interface SchemaField {
    key?: string; // UI only
    keyError?: string; // UI only — validation message for the key input
    showConstraints?: boolean; // UI only — constraints section toggle
    type: SchemaTypeEnum;
    description?: string;
    required?: boolean;
    properties?: Record<string, SchemaField>;
    items?: SchemaField;
    // JSON Schema constraint keywords (optional, per-type).
    enum?: Array<string | number>;
    format?: string;
    minLength?: number | null;
    maxLength?: number | null;
    minimum?: number | null;
    maximum?: number | null;
    default?: string | number | boolean | null;
}

@Component({
    standalone: false,
    selector: 'app-schema-node-editor',
    templateUrl: './schema-node-editor.component.html',
    styleUrls: ['./schema-node-editor.component.scss'],
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

    /** Explicit render/serialize order for object properties. Kept in sync
     *  with `field.properties`; drag-drop and add/remove mutate this, and the
     *  properties Record is rebuilt from it so JSON Schema key order follows. */
    public orderedKeys: string[] = [];

    /** JSON Schema `format` options offered for string fields. */
    public readonly stringFormats = [
        '',
        'date-time',
        'date',
        'time',
        'email',
        'uri',
        'uuid',
        'ipv4',
        'hostname',
    ];

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

        this.syncOrderFromProperties();
    }

    /** Rebuild `orderedKeys` from the current properties, preserving any
     *  existing order and appending keys not yet tracked (e.g. after a
     *  JSON→UI parse that populated properties directly). */
    private syncOrderFromProperties(): void {
        const keys = Object.keys(this.field.properties ?? {});
        const kept = this.orderedKeys.filter((k) => keys.includes(k));
        const added = keys.filter((k) => !kept.includes(k));
        this.orderedKeys = [...kept, ...added];
    }

    /** Rewrite `field.properties` so its key order matches `orderedKeys`. */
    private rebuildPropertiesInOrder(): void {
        if (!this.field.properties) return;
        const next: Record<string, SchemaField> = {};
        for (const k of this.orderedKeys) {
            if (this.field.properties[k]) {
                next[k] = this.field.properties[k];
            }
        }
        this.field.properties = next;
    }

    /** Bubble a key rename up to the parent, which owns the properties Record
     *  and the ordering. `oldKey` tracks the last-committed key for this node. */
    public emitKeyChange(newKey: string): void {
        this.keyChange.emit({ oldKey: this.oldKey, newKey });
        const trimmed = (newKey ?? '').trim();
        // Advance oldKey only once the rename is accepted (non-empty & unique);
        // the parent leaves the Record key unchanged otherwise.
        if (trimmed && !this.field.keyError) {
            this.oldKey = trimmed;
        }
    }

    /** Re-read ordering after a child key rename changed the Record's keys. */
    public onChildKeyChange(evt: { oldKey: string; newKey: string }): void {
        this.onKeyChange(evt.oldKey, evt.newKey);
        const idx = this.orderedKeys.indexOf(evt.oldKey);
        const trimmed = (evt.newKey ?? '').trim();
        // Only remap the order entry when the rename actually took effect
        // (no empty/duplicate error left the key unchanged).
        if (idx !== -1 && trimmed && this.field.properties?.[trimmed]) {
            this.orderedKeys[idx] = trimmed;
        }
    }

    public dropProperty(event: CdkDragDrop<string[]>): void {
        const keys = [...this.orderedKeys];
        const [moved] = keys.splice(event.previousIndex, 1);
        keys.splice(event.currentIndex, 0, moved);
        this.orderedKeys = keys;
        this.rebuildPropertiesInOrder();
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
        this.orderedKeys = [...this.orderedKeys, newKey];
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
        this.orderedKeys = this.orderedKeys.filter((k) => k !== key);
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
            this.orderedKeys = [];
        } else if (this.field.type === SchemaTypeEnum.Array) {
            this.field.items = { type: SchemaTypeEnum.String }; // Default item type
            delete this.field.properties;
            this.orderedKeys = [];
        } else {
            delete this.field.properties;
            delete this.field.items;
            this.orderedKeys = [];
        }
        // Clear constraints that no longer apply to the new type so stale
        // keywords don't leak into the serialized schema.
        this.clearIrrelevantConstraints();
    }

    /** Drops constraint keywords that don't apply to the current type. */
    private clearIrrelevantConstraints(): void {
        const f = this.field;
        const isString = f.type === SchemaTypeEnum.String;
        const isNumeric =
            f.type === SchemaTypeEnum.Number ||
            f.type === SchemaTypeEnum.Integer;
        const isPrimitive = isString || isNumeric || f.type === SchemaTypeEnum.Boolean;

        if (!isString) {
            delete f.format;
            f.minLength = null;
            f.maxLength = null;
        }
        if (!isNumeric) {
            f.minimum = null;
            f.maximum = null;
        }
        if (!isString && !isNumeric) {
            delete f.enum;
        }
        if (!isPrimitive) {
            delete f.default;
        }
    }

    // --- Constraints UI --------------------------------------------------

    public get isStringField(): boolean {
        return this.field.type === SchemaTypeEnum.String;
    }

    public get isNumericField(): boolean {
        return (
            this.field.type === SchemaTypeEnum.Number ||
            this.field.type === SchemaTypeEnum.Integer
        );
    }

    public get isBooleanField(): boolean {
        return this.field.type === SchemaTypeEnum.Boolean;
    }

    /** Whether this field supports any constraint inputs at all. */
    public get supportsConstraints(): boolean {
        return this.isStringField || this.isNumericField || this.isBooleanField;
    }

    public toggleConstraints(): void {
        this.field.showConstraints = !this.field.showConstraints;
    }

    public addEnumValue(raw: string): void {
        const value = (raw ?? '').trim();
        if (!value) return;
        const coerced: string | number = this.isNumericField
            ? Number(value)
            : value;
        if (this.isNumericField && Number.isNaN(coerced as number)) {
            return;
        }
        if (!this.field.enum) this.field.enum = [];
        if (!this.field.enum.some((v) => v === coerced)) {
            this.field.enum.push(coerced);
        }
    }

    public removeEnumValue(value: string | number): void {
        if (!this.field.enum) return;
        this.field.enum = this.field.enum.filter((v) => v !== value);
        if (this.field.enum.length === 0) {
            delete this.field.enum;
        }
    }
}
