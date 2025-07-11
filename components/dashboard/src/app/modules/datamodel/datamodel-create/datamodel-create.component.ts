import {
    AfterViewInit,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from '@angular/core'
import {
    UntypedFormBuilder,
    UntypedFormControl,
    UntypedFormGroup,
    Validators,
} from '@angular/forms'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { Observable } from 'rxjs'
import { map, startWith } from 'rxjs/operators'
import { MatStepper } from '@angular/material/stepper'
import slugify from 'slugify'
import { DeviceService } from '../../../shared/services/device/device.service'
import {
    AuthPolicy,
} from '../../../shared/services/device/device.interface'
import { ToastrService } from '../../../shared/services/toastr/toastr.service'
import { v4 as uuidv4 } from 'uuid'
import {
    CredentialDataInput,
    DeviceInput,
    DeviceStatus,
} from '../../../shared/graphql/generated'

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
    properties?: SchemaField[]; // for object
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
        private deviceService: DeviceService,
        private toast: ToastrService
    ) {}

    public ngOnInit(): void {
        this.datamodelFormGroup = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(128)]],
            description: ['', [Validators.required, Validators.maxLength(512)]],
            code: [this.exampleSchema, [Validators.required]],
        });

        // try below to parse the example schema and then render it
        this.root = JSON.parse(this.exampleSchema);
    }

    public root: SchemaField = { type: SchemaTypeEnum.Object, properties: [] };
    schemaOutput: any = {};

    public generateSchema() {
        this.schemaOutput = this.buildSchema(this.root);
    }

    private buildSchema(field: SchemaField): any {
        if (field.type === SchemaTypeEnum.Object) {
            const obj: any = {
                type: SchemaTypeEnum.Object,
                properties: {},
            };
            const required: string[] = [];

            field.properties?.forEach(prop => {
                if (prop.key) {
                    obj.properties[prop.key] = this.buildSchema(prop);
                    if (prop.required) required.push(prop.key);
                }
            });

            if (required.length > 0) obj.required = required;
            return obj;
        }

        if (field.type === SchemaTypeEnum.Array) {
            return {
                type: SchemaTypeEnum.Array,
                items: this.buildSchema(field.items!)
            };
        }

        return { type: field.type };
    }
}
