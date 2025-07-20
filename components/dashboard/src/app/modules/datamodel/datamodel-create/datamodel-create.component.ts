import {
    Component,
    OnInit,
} from '@angular/core'
import {
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms'
import {
     DataModelInput,
} from '../../../shared/graphql/generated'
import {Router} from "@angular/router";
import {DatamodelService} from "../../../shared/services/datamodel/datamodel.service";
import {JsonSchemaService} from "../../../shared/services/jsonschema/jsonschema.service";

enum SchemaTypeEnum {
    Object = 'object',
    Array = 'array',
    String = 'string',
    Number = 'number',
    Boolean = 'boolean'
}

enum Mode {
    UI = 'ui',
    CODE = 'code'
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
    selector: 'app-datamodel-create',
    templateUrl: './datamodel-create.component.html',
    styleUrls: ['./datamodel-create.component.scss'],
})
export class DatamodelCreateComponent implements OnInit {
    private exampleSchema = '{\n  "type": "object",\n  "properties": {\n    "temperature": { "type": "number" },\n    "humidity": { "type": "number" },\n    "deviceId": { "type": "string" }\n  },\n  "required": ["temperature", "humidity"]\n}'

    public mode: 'ui' | 'code' = 'code';
    public selectedMode: Mode = Mode.CODE;

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
            bottom: 10
        },
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto'
        }
    };

    editorInstance!: any

    constructor(
        private fb: UntypedFormBuilder,
        private router: Router,
        private dataModelService: DatamodelService,
        private jsonSchemaService: JsonSchemaService,
    ) {}

    public ngOnInit(): void {
        this.datamodelFormGroup = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(128)]],
            description: ['', [Validators.required, Validators.maxLength(512)]],
            code: [this.exampleSchema, [Validators.required]],
        });

        this.root = JSON.parse(this.exampleSchema);
    }

    editorInit(editor: any) {
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
            schema: this.schemaOutput,
        }
        this.dataModelService.createDataModel(dataModelInput).subscribe((result) => {
            this.router.navigate(['/datamodel']);
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
                items: this.buildSchema(field.items!)
            };
        }

        return {
            type: field.type,
            // description: field.description || undefined
        };
    }

    public async onUiToggleClick() {
        const code: string = this.datamodelFormGroup.get('code').value;

        const monacoInstance = (window as any).monaco as typeof import('monaco-editor');
        const model = this.editorInstance.getModel();
        if (!model) return;

        try {
            const isValid = await this.jsonSchemaService.validateSchema(code)
            if (!isValid) {
                throw new Error('Invalid JSON schema');
            }
            monacoInstance.editor.setModelMarkers(model, 'owner', []);

        } catch (error) {
            this.selectedMode = Mode.CODE
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
            return
        }

        this.root = JSON.parse(code);
        this.mode = Mode.UI
    }

    public onCodeToggleClick() {
        this.mode = Mode.CODE
    }
}
