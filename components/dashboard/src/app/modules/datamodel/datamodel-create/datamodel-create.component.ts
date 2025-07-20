import {
    AfterViewInit,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
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

    constructor(
        private fb: UntypedFormBuilder,
        private router: Router,
        private dataModelService: DatamodelService,
    ) {}

    public ngOnInit(): void {
        this.datamodelFormGroup = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(128)]],
            description: ['', [Validators.required, Validators.maxLength(512)]],
            code: [this.exampleSchema, [Validators.required]],
        });

        this.root = JSON.parse(this.exampleSchema);
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
            console.log('Data model created:', result);

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

}
