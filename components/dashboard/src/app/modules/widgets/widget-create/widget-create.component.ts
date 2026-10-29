import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
    STEPPER_GLOBAL_OPTIONS,
    StepperSelectionEvent,
} from '@angular/cdk/stepper';
import {
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import {
    BlocklyComponent,
    BlocklyConfig,
    BlocklyToolbox,
    CustomBlock,
    Category,
    Separator,
    Button,
    Label,
    LOGIC_CATEGORY,
    LOOP_CATEGORY,
    MATH_CATEGORY,
    TEXT_CATEGORY,
    LISTS_CATEGORY,
    COLOUR_CATEGORY,
    VARIABLES_CATEGORY,
    FUNCTIONS_CATEGORY,
} from '../../../shared/blockly';
import { DeviceService } from 'src/app/shared/services/device/device.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DynamicDropdownBlock } from '../../../shared/blocks/dynamic-dropdown';
import { AggregationBlock } from '../../../shared/blocks/aggregation';
import { IOperation, OperationBlock } from '../../../shared/blocks/operation';
import { RepeatForBlock } from '../../../shared/blocks/repeatFor';
import {
    DeviceInfoFragment,
    WidgetInput,
    WidgetStatus,
} from 'src/app/shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { WidgetService } from '../../../shared/services/widget/widget.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { Router, ActivatedRoute } from '@angular/router';
import { WidgetTemplate } from '../../../shared/templates/widget-templates';
import { WidgetScheduleFormComponent } from './components/widget-schedule-form/widget-schedule-form.component';

@Component({
    standalone: false,
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
export class WidgetCreateComponent implements OnInit, HasUnsavedChanges {
    public readonly NAME_MAX_LENGTH = 64;
    public readonly DESCRIPTION_MAX_LENGTH = 256;
    public readonly separatorKeysCodes: number[] = [ENTER, COMMA];
    public isLoaded = false;

    // Template selection
    public selectedTemplate: WidgetTemplate | null = null;

    // Schedule prefill passed to the schedule sub-form (duplicate/edit).
    public prefillSchedule?: string;
    public reviewSchedule = 'Manual (no schedule)';
    public isSaving = false;

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
    ];
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
    ];

    public detailsFormGroup: UntypedFormGroup;

    public devices: DeviceInfoFragment[];
    public selectedDevices: Set<DeviceInfoFragment> = new Set();
    public filteredDevices: Observable<DeviceInfoFragment[]>;

    @ViewChild('deviceInput') public deviceInput: ElementRef<HTMLInputElement>;

    public readOnly = false;

    public customBlocks: CustomBlock[] = [];
    public button: Button = new Button('ExampleButton', 'TestButton');
    public label: Label = new Label('ExampleLabel', 'TestLabel');
    public workspaceXML: string;
    public workspaceCode: string;
    private submitted = false;
    private duplicateWorkspace: string | null = null;
    public editId: string | null = null;
    private prefillDeviceIds: string[] = [];

    public config: BlocklyConfig = {
        trashcan: true,
        move: {
            scrollbars: true,
            wheel: true,
        },
        oneBasedIndex: true,
        zoom: {
            controls: true,
            wheel: true,
            pinch: true,
        },
        grid: {
            spacing: 5,
        },
        css: true,
    };

    private blocklyComponent: BlocklyComponent;

    @ViewChild(WidgetScheduleFormComponent)
    public scheduleForm?: WidgetScheduleFormComponent;

    @ViewChild('blockly', { static: false }) set blockly(
        content: BlocklyComponent
    ) {
        if (content) {
            this.blocklyComponent = content;
        }
    }

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private formBuilder: UntypedFormBuilder,
        private deviceService: DeviceService,
        private widgetService: WidgetService,
        private toast: ToastrService
    ) {}

    ngOnInit(): void {
        this.editId = this.route.snapshot.paramMap.get('id');

        // Build the form empty first; pre-fill values are applied once the
        // source (duplicate payload or the fetched widget in edit mode) is known.
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
        });

        if (this.editId) {
            this.widgetService.getById(this.editId).subscribe({
                next: (widget) => {
                    if (widget) {
                        this.applyPrefill(widget);
                    } else {
                        this.toast.showError('Widget not found');
                    }
                    this.loadDevices();
                },
                error: (err) => {
                    console.error('Failed to load widget:', err);
                    this.toast.showError('Failed to load widget');
                    this.loadDevices();
                },
            });
        } else {
            const duplicateData = history.state?.duplicate;
            if (duplicateData) {
                this.applyPrefill(duplicateData);
            }
            this.loadDevices();
        }
    }

    // applyPrefill seeds the form + workspace + schedule from an existing widget
    // (used for both duplicate and edit). Device pre-selection happens in
    // loadDevices once the device list is available.
    private applyPrefill(source: any): void {
        this.detailsFormGroup.patchValue({
            name: source.name || '',
            description: source.description || '',
            isActive: source.status ? source.status === WidgetStatus.Active : true,
        });

        this.prefillDeviceIds = source.deviceIds || [];
        this.duplicateWorkspace = source.workspace || null;
        // Seed workspaceXML so an untouched Blockly editor still saves the
        // original workspace (workspaceChange only fires on edits).
        if (source.workspace) {
            this.workspaceXML = source.workspace;
        }
        if (source.code) {
            this.workspaceCode = source.code;
        }

        if (source.schedule) {
            this.prefillSchedule = source.schedule;
        }
    }

    private loadDevices(): void {
        this.deviceService.getAllDevices().subscribe({
            next: (deviceList) => {
                this.devices = deviceList;

                // Pre-select devices from the pre-fill source
                if (this.prefillDeviceIds.length > 0) {
                    deviceList.forEach((device) => {
                        if (this.prefillDeviceIds.includes(device.id)) {
                            this.selectedDevices.add(device);
                        }
                    });
                }

                this.isLoaded = true;

                this.filteredDevices = this.detailsFormGroup
                    .get('device')
                    .valueChanges.pipe(
                        startWith(null),
                        map((device: string | null) =>
                            device ? this._filter(device) : this.devices.slice()
                        )
                    );
            },
            error: (err) => {
                console.error('Failed to load devices:', err);
                this.toast.showError('Failed to load devices. Please check authentication.');
                this.devices = [];
                this.isLoaded = true;
            },
        });
    }

    private buildBlocklyToolbox(): void {
        // Use only selected devices for Blockly blocks
        const selectedDevicesList = Array.from(this.selectedDevices.values());
        const dynamicDropdownDevices = selectedDevicesList.map((device) => [
            device.name,
            device.id,
        ]);

        const dropdownOutput = new DynamicDropdownBlock(
            'deviceDropdownOutput',
            {
                id: 'selectedDeviceOutput',
                data: dynamicDropdownDevices,
                isOutput: true,
            }
        );
        const dropdownInput = new DynamicDropdownBlock(
            'deviceDropdownInput',
            {
                id: 'selectedDeviceInput',
                data: dynamicDropdownDevices,
                isOutput: false,
            }
        );
        const deviceBlocks = [dropdownOutput, dropdownInput];

        const aggregations = this.aggregationOperations.map(
            (agg, idx) =>
                new AggregationBlock('aggregation_' + idx, { ...agg })
        );
        const operations = this.operations.map(
            (op, idx) => new OperationBlock('operation_' + idx, { ...op })
        );
        const repeats = [
            new RepeatForBlock('repeatForBlock', { id: 'repeatForBlock' }),
        ];

        this.customBlocks = [
            ...deviceBlocks,
            ...aggregations,
            ...operations,
            ...repeats,
        ];

        const toolbox = new BlocklyToolbox();
        toolbox.nodes = [
            LOGIC_CATEGORY,
            LOOP_CATEGORY,
            MATH_CATEGORY,
            TEXT_CATEGORY,
            LISTS_CATEGORY,
            COLOUR_CATEGORY,
            new Category('Repeats', '#5b80a5', repeats),
            new Separator(),
            VARIABLES_CATEGORY,
            FUNCTIONS_CATEGORY,
            new Separator(),
            new Category('Devices', '#5b80a5', deviceBlocks),
            new Category('Aggregations', '#00AFFF', aggregations),
            new Category('Operations', '#00AA00', operations),
        ];

        this.config.toolbox = toolbox.toJSON();
    }

    onCode(code: string) {
        this.workspaceCode = code;
    }

    removeDevice(keyword) {
        this.selectedDevices.delete(keyword);
    }

    selected(event: MatAutocompleteSelectedEvent): void {
        this.selectedDevices.add(event.option.value as DeviceInfoFragment);
        this.detailsFormGroup.get('device').setValue('');
        this.deviceInput.nativeElement.value = '';
    }

    public hasUnsavedChanges(): boolean {
        return this.detailsFormGroup?.dirty && !this.submitted;
    }

    public async onSaveClick(): Promise<void> {
        if (this.isSaving) {
            return;
        }

        const model = this.convertToModel();
        this.isSaving = true;
        if (this.editId) {
            this.widgetService.update(this.editId, model).subscribe({
                next: () => {
                    this.submitted = true;
                    this.toast.showSuccess('Successfully updated widget');
                    this.router.navigate(['widgets']);
                },
                error: () => {
                    this.toast.showError('Failed to update widget');
                    this.isSaving = false;
                },
            });
        } else {
            this.widgetService.create(model).subscribe({
                next: () => {
                    this.submitted = true;
                    this.toast.showSuccess('Successfully created widget');
                    this.router.navigate(['widgets']);
                },
                error: () => {
                    this.toast.showError('Failed to create widget');
                    this.isSaving = false;
                },
            });
        }
    }

    private convertToModel(): WidgetInput {
        return {
            name: this.detailsFormGroup.get('name').value,
            description: this.detailsFormGroup.get('description').value,
            status: this.detailsFormGroup.get('isActive').value
                ? WidgetStatus.Active
                : WidgetStatus.Inactive,
            code: this.workspaceCode,
            workspace: this.workspaceXML,
            deviceIds: Array.from(this.selectedDevices.values()).map(
                (device) => device.id
            ),
            schedule: this.scheduleForm?.getScheduleValue() ?? null,
        };
    }

    public onScheduleChange(_schedule: string | null): void {
        // Schedule value is read from the sub-form at save time; this handler
        // exists so the parent can react to changes if needed in future.
    }

    public onResetClick(stepper: { reset: () => void }): void {
        // The refactor moved schedule + template state into sub-forms, so Reset
        // must clear them explicitly rather than relying on stepper.reset().
        this.scheduleForm?.reset();
        this.selectedTemplate = null;
        this.reviewSchedule = 'Manual (no schedule)';
        stepper.reset();
    }

    private _filter(value: string): DeviceInfoFragment[] {
        if (typeof value !== 'string') {
            return this.devices;
        }
        const filterValue = value.toLowerCase();

        return this.devices.filter((d) =>
            d.name.toLowerCase().includes(filterValue)
        );
    }

    public onNavigateToBlockly(): void {
        // Rebuild toolbox with currently selected devices
        this.buildBlocklyToolbox();

        setTimeout(() => {
            this.blocklyComponent.resize();

            // Restore workspace from duplicate data if available
            if (this.duplicateWorkspace) {
                this.blocklyComponent.fromXml(this.duplicateWorkspace);
                this.duplicateWorkspace = null; // Only restore once
            } else if (this.selectedTemplate && this.selectedTemplate.id !== 'blank') {
                // Load selected template
                this.blocklyComponent.fromXml(this.selectedTemplate.workspace);
            }
        }, 100);
    }

    public selectTemplate(template: WidgetTemplate): void {
        this.selectedTemplate = template;
    }

    public workspaceChange(event) {
        if (!event || !event.workspaceId) {
            return;
        }
        this.workspaceXML = this.blocklyComponent.toXml();
    }

    public onSelectionChange(event: StepperSelectionEvent) {
        if (event.selectedIndex === 1) {
            this.onNavigateToBlockly();
        }
        if (event.selectedIndex === 2) {
            // Snapshot the schedule for the Review step so the template binds
            // to a stable field rather than calling the sub-form getter in CD.
            this.reviewSchedule =
                this.scheduleForm?.getScheduleValue() || 'Manual (no schedule)';
        }
    }
}
