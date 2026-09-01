import { Component, OnInit } from '@angular/core';
import {
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { DataModelInput } from '../../../shared/graphql/generated';
import { Router } from '@angular/router';
import { DatamodelService } from '../../../shared/services/datamodel/datamodel.service';
import { JsonSchemaService } from '../../../shared/services/jsonschema/jsonschema.service';
import { SchemaTemplate } from '../schema-templates';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';

export enum SchemaTypeEnum {
    Object = 'object',
    Array = 'array',
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
}

export enum Mode {
    UI = 'ui',
    CODE = 'code',
}

interface SchemaField {
    key?: string;
    type: SchemaTypeEnum;
    required?: boolean;
    properties?: {
        [key: string]: SchemaField;
    };
    items?: SchemaField; // for array
}

@Component({
    standalone: false,
    selector: 'app-datamodel-create',
    templateUrl: './datamodel-create.component.html',
    styleUrls: ['./datamodel-create.component.scss'],
})
export class DatamodelCreateComponent implements OnInit, HasUnsavedChanges {
    private defaultSchema =
        '{\n  "type": "object",\n  "properties": {\n    "temperature": { "type": "number" },\n    "humidity": { "type": "number" },\n    "deviceId": { "type": "string" }\n  },\n  "required": ["temperature", "humidity"]\n}';

    public mode: 'ui' | 'code' = 'code';
    public selectedMode: Mode = Mode.CODE;
    public templateUsed: SchemaTemplate | null = null;
    private submitted = false;

    public datamodelFormGroup: UntypedFormGroup;
    public editorOptions = {
        theme: 'vs-dark',
        language: 'json',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        folding: true,
        tabSize: 2,
        padding: {
            top: 10,
            bottom: 10,
        },
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
        },
    };

    public editorInstance!: any;

    constructor(
        private fb: UntypedFormBuilder,
        private router: Router,
        private dataModelService: DatamodelService,
        private jsonSchemaService: JsonSchemaService,
        private toast: ToastrService
    ) {}

    public hasUnsavedChanges(): boolean {
        return this.datamodelFormGroup?.dirty && !this.submitted;
    }

    public ngOnInit(): void {
        // Check for template from navigation state
        const template: SchemaTemplate | null = history.state?.template;
        this.templateUsed = template;

        let initialName = '';
        let initialDescription = '';
        let initialSchema = this.defaultSchema;

        if (template) {
            initialName = template.name;
            initialDescription = template.description;
            initialSchema = JSON.stringify(template.schema, null, 2);
        }

        this.datamodelFormGroup = this.fb.group({
            name: [initialName, [Validators.required, Validators.maxLength(128)]],
            description: [initialDescription, [Validators.required, Validators.maxLength(512)]],
            code: [initialSchema, [Validators.required]],
        });

        this.root = JSON.parse(initialSchema);
    }

    public editorInit(editor: any) {
        this.editorInstance = editor;
    }

    public root: SchemaField = { type: SchemaTypeEnum.Object, properties: {} };
    schemaOutput: any = {};

    public generateSchema() {
        this.schemaOutput = this.buildSchema(this.root);
    }

    public saveDatamodel() {
        const dataModelInput: DataModelInput = {
            name: this.datamodelFormGroup.get('name').value,
            description: this.datamodelFormGroup.get('description').value,
            schema: this.buildSchema(this.root),
        };
        this.dataModelService
            .createDataModel(dataModelInput)
            .subscribe({
                next: () => {
                    this.submitted = true;
                    this.toast.showSuccess('Data model created');
                    this.router.navigate(['/datamodel']);
                },
                error: (err) => {
                    console.error('Failed to create data model:', err);
                    this.toast.showError('Failed to create data model');
                },
            });
    }

    public cancel() {
        this.router.navigate(['/datamodel']);
    }

    buildSchema(field: SchemaField): any {
        if (field.type === SchemaTypeEnum.Object) {
            const schema: any = {
                type: SchemaTypeEnum.Object,
                properties: {},
            };

                const required: string[] = [];

            for (const key in field.properties) {
                const prop = field.properties[key];
                schema.properties[key] = this.buildSchema(prop);
                if (prop.required) {
                    required.push(key);
                }
            }

            if (required.length > 0) {
                schema.required = required;
            }

            return schema;
        }

        if (field.type === SchemaTypeEnum.Array) {
            return {
                type: SchemaTypeEnum.Array,
                items: this.buildSchema(field.items!),
            };
        }

        return {
            type: field.type,
            // description: field.description || undefined
        };
    }

    public async onUiToggleClick() {
        const code: string = this.datamodelFormGroup.get('code').value;

        const monacoInstance = (window as any)
            .monaco as typeof import('monaco-editor');
        const model = this.editorInstance?.getModel();
        if (!model) {
            try {
                const isValid = await this.jsonSchemaService.validateSchema(code);
                if (isValid) {
                    this.root = JSON.parse(code);
                    this.mode = Mode.UI;
                }
            } catch {
                this.selectedMode = Mode.CODE;
            }
            return;
        }

        try {
            const isValid = await this.jsonSchemaService.validateSchema(code);
            if (!isValid) {
                throw new Error('Invalid JSON schema');
            }
            monacoInstance.editor.setModelMarkers(model, 'owner', []);
        } catch (error) {
            this.selectedMode = Mode.CODE;
            const markers = [];

            if (!code.trim()) {
                markers.push({
                    severity: monacoInstance.MarkerSeverity.Error,
                    message: 'Code cannot be empty.',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 2,
                });
            }

            monacoInstance.editor.setModelMarkers(model, 'owner', markers);
            this.toast.showError(
                'Fix the JSON schema errors before switching to the visual editor.'
            );
            return;
        }
        this.root = this.buildSchema(JSON.parse(code));
        this.mode = Mode.UI;
    }

    public onCodeToggleClick() {
        const a = JSON.stringify(this.buildSchema(this.root), null, 2); // 2 spaces indentation and newlines
        this.datamodelFormGroup.get('code').setValue(a);
        this.mode = Mode.CODE;

        setTimeout(() => {
            if (this.editorInstance) {
                this.editorInstance.getAction('editor.action.formatDocument').run();
            }
        })


    }
}
