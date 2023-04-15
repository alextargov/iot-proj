import { Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import {
    STEPPER_GLOBAL_OPTIONS,
    StepperSelectionEvent,
} from '@angular/cdk/stepper'
import {
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms'
import { COMMA, ENTER } from '@angular/cdk/keycodes'

import {
    Blockly,
    Button,
    Category,
    COLOUR_CATEGORY,
    CustomBlock,
    FUNCTIONS_CATEGORY,
    Label,
    LISTS_CATEGORY,
    LOGIC_CATEGORY,
    LOOP_CATEGORY,
    MATH_CATEGORY,
    NgxBlocklyComponent,
    NgxBlocklyConfig,
    NgxBlocklyGenerator,
    NgxBlocklyToolbox,
    Separator,
    TEXT_CATEGORY,
    VARIABLES_CATEGORY,
} from 'ngx-blockly'
import { DeviceService } from 'src/app/shared/services/device/device.service'
import { IDevice } from 'src/app/shared/services/device/device.interface'
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { Observable } from 'rxjs'
import { map, startWith } from 'rxjs/operators'
import { DynamicDropdownBlock } from '../../../shared/blocks/dynamic-dropdown'
import { AggregationBlock } from '../../../shared/blocks/aggregation'
import { IOperation, OperationBlock } from '../../../shared/blocks/operation'
import { RepeatForBlock } from '../../../shared/blocks/repeatFor'
import { DeviceInfoFragment } from 'src/app/shared/graphql/generated'

@Component({
    selector: 'app-widget-create',
    templateUrl: './widget-create.component.html',
    styleUrls: ['./widget-create.component.scss'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { showError: true },
        },
    ],
})
export class WidgetCreateComponent implements OnInit {
    public readonly NAME_MAX_LENGTH = 64
    public readonly DESCRIPTION_MAX_LENGTH = 256
    public readonly separatorKeysCodes: number[] = [ENTER, COMMA]
    public isLoaded = false
    private readonly aggregationOperations: any[] = [
        {
            id: 'sum',
            name: 'Sum',
        },
        {
            id: 'average',
            name: 'Average',
            options: [
                ['Last 7 days', '7Days'],
                ['Last 1 day', '1Days'],
                ['Last 1 hour', '1Hour'],
            ],
        },
        {
            id: 'current',
            name: 'Current',
            code: `try {
              const response = await axios.get('/user?ID=12345');
              console.log(response);
            } catch (error) {
              console.error(error);
            }`,
        },
    ]
    private readonly operations: IOperation[] = [
        {
            id: 'turnon',
            name: 'Turn on',
            hasOutputConnection: true,
            hasPrevConnection: false,
            hasNextConnection: false,
        },
        {
            id: 'turnoff',
            name: 'Turn off',
            hasOutputConnection: true,
            hasPrevConnection: false,
            hasNextConnection: false,
        },
        {
            id: 'sendEmail',
            name: 'Send email to:',
            hasInput: true,
            hasOutputConnection: false,
            hasPrevConnection: true,
            hasNextConnection: true,
        },
        {
            id: 'sendEmailWithContent',
            name: 'Send email to:',
            hasInput: true,
            hasOutputConnection: false,
            hasPrevConnection: true,
            hasNextConnection: true,
            additionalText: 'with content:',
            hasSecondInput: true,
        },
    ]

    public detailsFormGroup: UntypedFormGroup

    public devices: DeviceInfoFragment[]
    public selectedDevices: Set<DeviceInfoFragment> = new Set()
    public filteredDevices: Observable<DeviceInfoFragment[]>

    @ViewChild('deviceInput') public deviceInput: ElementRef<HTMLInputElement>

    public readOnly = false

    public customBlocks: CustomBlock[] = []
    public button: Button = new Button('ExampleButton', 'TestButton')
    public label: Label = new Label('ExampleLabel', 'TestLabel')
    public workspaceXML: string
    public workspaceCode: string

    public config: NgxBlocklyConfig = {
        trashcan: true,
        generators: [NgxBlocklyGenerator.JAVASCRIPT],
        defaultBlocks: true,
        move: {
            scrollbars: true,
            wheel: true,
        },
        oneBasedIndex: true,
        plugins: {
            toolbox: NgxBlocklyToolbox,
        },
        zoom: {
            controls: true,
            wheel: true,
            pinch: true,
        },
        grid: {
            spacing: 5,
        },
        css: true,
    }

    @ViewChild('blockly') blocklyComponent: NgxBlocklyComponent

    constructor(
        private formBuilder: UntypedFormBuilder,
        private deviceService: DeviceService
    ) {}
    ngOnInit(): void {
        this.detailsFormGroup = this.formBuilder.group({
            name: [
                '',
                [
                    Validators.required,
                    Validators.maxLength(this.NAME_MAX_LENGTH),
                ],
            ],
            description: [
                '',
                Validators.maxLength(this.DESCRIPTION_MAX_LENGTH),
            ],
            isActive: [true],
            device: [''],
        })

        const workspace = new Blockly.WorkspaceSvg(new Blockly.Options({}))
        const toolbox: NgxBlocklyToolbox = new NgxBlocklyToolbox(workspace)

        this.deviceService.getAllDevices().subscribe((deviceList) => {
            this.devices = deviceList
            console.log(deviceList)

            const workspace = new Blockly.WorkspaceSvg(new Blockly.Options({}))
            const toolbox: NgxBlocklyToolbox = new NgxBlocklyToolbox(workspace)

            const dynamicDropdownDevices = deviceList.map((device) => [
                device.name,
                device.id,
            ])
            const dropdownOutput = new DynamicDropdownBlock(
                'deviceDropdownOutput',
                {
                    id: 'selectedDeviceOutput',
                    data: dynamicDropdownDevices,
                    isOutput: true,
                }
            )
            const dropdownInput = new DynamicDropdownBlock(
                'deviceDropdownInput',
                {
                    id: 'selectedDeviceInput',
                    data: dynamicDropdownDevices,
                    isOutput: false,
                }
            )
            const deviceBlocks = [dropdownOutput, dropdownInput]

            const aggregations = this.aggregationOperations.map(
                (agg, idx) =>
                    new AggregationBlock('aggregation_' + idx, { ...agg })
            )
            const operations = this.operations.map(
                (op, idx) => new OperationBlock('operation_' + idx, { ...op })
            )
            const repeats = [
                new RepeatForBlock('repeatForBlock', { id: 'repeatForBlock' }),
            ]

            this.customBlocks.push(
                ...deviceBlocks,
                ...aggregations,
                ...operations,
                ...repeats
            )

            toolbox.nodes = [
                LOGIC_CATEGORY,
                LOOP_CATEGORY,
                MATH_CATEGORY,
                TEXT_CATEGORY,
                LISTS_CATEGORY,
                COLOUR_CATEGORY,
                new Category('Repeats', '%{BKY_LOGIC_HUE}', repeats),
                new Separator(),
                VARIABLES_CATEGORY,
                FUNCTIONS_CATEGORY,
                new Separator(),
                new Category('Devices', '%{BKY_LOGIC_HUE}', deviceBlocks),
                new Category('Aggregations', '#00AFFF', aggregations),
                new Category('Operations', '#00AA00', operations),
            ]

            this.config.toolbox = toolbox.toXML()

            this.isLoaded = true

            this.filteredDevices = this.detailsFormGroup
                .get('device')
                .valueChanges.pipe(
                    startWith(null),
                    map((fruit: string | null) =>
                        fruit ? this._filter(fruit) : this.devices.slice()
                    )
                )
        })
    }

    onCode(code: string) {
        this.workspaceCode = code
        console.log(code)
    }

    removeDevice(keyword) {
        this.selectedDevices.delete(keyword)
    }

    selected(event: MatAutocompleteSelectedEvent): void {
        this.selectedDevices.add(event.option.value as DeviceInfoFragment)
        this.detailsFormGroup.get('device').setValue('')
        this.deviceInput.nativeElement.value = ''
    }

    private _filter(value: string): DeviceInfoFragment[] {
        if (typeof value !== 'string') {
            return this.devices
        }
        const filterValue = value.toLowerCase()

        return this.devices.filter((d) =>
            d.name.toLowerCase().includes(filterValue)
        )
    }

    public onNavigateToBlockly(): void {
        setTimeout(() => {
            this.blocklyComponent.resize()
            //       this.blocklyComponent.fromXml(`<xml xmlns="https://developers.google.com/blockly/xml">
            //   <block type="controls_if" id="aWfzI?F$qXe8;y,6=j[V" x="29" y="8"></block>
            //   <block type="repeatForBlock" id="hnF\`HuTwmUu*cN_:i(?P" x="33" y="14">
            //     <field name="intervalValue">1</field>
            //     <field name="intervalType">0</field>
            //   </block>
            // </xml>`)

            // this.blocklyComponent.fromXml(`<xml><block type="repeatForBlock" id="7PXEeoJd08$_MK)!I_9h" x="29" y="77"><field name="intervalValue">1</field><field name="intervalType">0</field><statement name="do"><block type="controls_if" id="G[@TMT,$5@:DP^}W4!WT"><value name="IF0"><block type="logic_compare" id="Gn.!bPr*p,SUE1Rlx+Hl"><field name="OP">EQ</field><value name="A"><block type="deviceDropdownOutput" id="Qs399?AkV%1|{|7$511+"><field name="selectedDeviceOutput">b2e8f85c-3caa-4d2e-8c0e-641385d3ddbc</field><value name="aggregation"><block type="aggregation_0" id="}g]322#ioc%aWV_kDWbt"></block></value></block></value><value name="B"><block type="math_number" id="I1Fu27{Ht:\`x/m;!+@]x"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="operation_2" id="GYL@Pb3M].LCx=|2B[x!"><value name="operation"><block type="text" id="Er,nBi;6#T(Bjg(]FU%d"><field name="TEXT">alex</field></block></value></block></statement></block></statement></block></xml>`)

            // Blockly.Xml.domToWorkspace(
            //   Blockly.Xml.textToDom(`<xml><block type="repeatForBlock" id="7PXEeoJd08$_MK)!I_9h" x="29" y="77"><field name="intervalValue">1</field><field name="intervalType">0</field><statement name="do"><block type="controls_if" id="G[@TMT,$5@:DP^}W4!WT"><value name="IF0"><block type="logic_compare" id="Gn.!bPr*p,SUE1Rlx+Hl"><field name="OP">EQ</field><value name="A"><block type="deviceDropdownOutput" id="Qs399?AkV%1|{|7$511+"><field name="selectedDeviceOutput">b2e8f85c-3caa-4d2e-8c0e-641385d3ddbc</field><value name="aggregation"><block type="aggregation_0" id="}g]322#ioc%aWV_kDWbt"></block></value></block></value><value name="B"><block type="math_number" id="I1Fu27{Ht:\`x/m;!+@]x"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="operation_2" id="GYL@Pb3M].LCx=|2B[x!"><value name="operation"><block type="text" id="Er,nBi;6#T(Bjg(]FU%d"><field name="TEXT">alex</field></block></value></block></statement></block></statement></block></xml>`),
            //   this.blocklyComponent.workspace
            // );
        }, 100)
    }

    public workspaceChange(event) {
        if (!event || !event.workspaceId) {
            return
        }
        this.workspaceXML = this.blocklyComponent.toXml()
    }

    public onSelectionChange(event: StepperSelectionEvent) {
        if (event.selectedIndex === 1) {
            this.onNavigateToBlockly()
        }
    }
}
