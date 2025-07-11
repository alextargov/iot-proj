import {Component, EventEmitter, Input, Output} from '@angular/core';

enum SchemaTypeEnum {
    Object = 'object',
    Array = 'array',
    String = 'string',
    Number = 'number',
    Boolean = 'boolean'
}

interface SchemaField {
    key?: string;
    type: SchemaTypeEnum;
    required?: boolean;
    properties?: SchemaField[];
    items?: SchemaField;
}

@Component({
    selector: 'app-schema-node-editor',
    templateUrl: './schema-node-editor.component.html'
})
export class SchemaNodeEditorComponent {
    @Input() field!: SchemaField;
    @Input() depth: number = 0;
    @Output() remove = new EventEmitter<void>();

    types = [SchemaTypeEnum.Object, SchemaTypeEnum.Array, SchemaTypeEnum.String, SchemaTypeEnum.Number, SchemaTypeEnum.Boolean];

    addProperty() {
        if (!this.field.properties) this.field.properties = [];
        this.field.properties.push({
            key: '',
            type: SchemaTypeEnum.String,
            required: false,
        });
    }

    removeProperty(index: number) {
        this.field.properties?.splice(index, 1);
    }

    initItems() {
        this.field.items = { type: SchemaTypeEnum.String };
    }

    removeArrayItems() {
        this.field.items = undefined;
    }

    indentStyle() {
        return { 'margin-left.px': this.depth * 20 };
    }
}
