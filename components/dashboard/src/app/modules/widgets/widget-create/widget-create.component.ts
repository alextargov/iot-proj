import { Component, ComponentFactoryResolver, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
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
  NgxBlocklyConfig,
  NgxBlocklyGenerator, NgxBlocklyToolbox,
  Separator,
  TEXT_CATEGORY,
  VARIABLES_CATEGORY,
  Blockly,
  NgxBlocklyComponent,
} from 'ngx-blockly';

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
  public detailsFormGroup: FormGroup;
  public readonly NAME_MAX_LENGTH = 64;
  public readonly DESCRIPTION_MAX_LENGTH = 256;

  public readOnly = false;

  public customBlocks: CustomBlock[] = [

  ];
  public button: Button = new Button('asd', 'asdasd');
  public label: Label = new Label('asd', 'asdasd');

  public config: NgxBlocklyConfig = {
    toolbox: '<xml id="toolbox" style="display: none">' +
      '<category name="Logic" colour="%{BKY_LOGIC_HUE}">' +
      '<block type="controls_if"></block>' +
      '<block type="controls_repeat_ext"></block>' +
      '<block type="logic_compare"></block>' +
      '<block type="math_number_property"></block>' +
      '<block type="math_number"></block>' +
      '<block type="math_arithmetic"></block>' +
      '<block type="text"></block>' +
      '<block type="text_print"></block>' +
      '<block type="example_block"></block>' +
      '</category>' +
      '</xml>',
    trashcan: true,
    generators: [
      NgxBlocklyGenerator.JAVASCRIPT,
    ],
    defaultBlocks: true,
    move: {
      scrollbars: true,
      wheel: true
    },
    plugins: {
      'toolbox': NgxBlocklyToolbox
    },
    zoom: {
      controls: true,
      wheel: true,
      pinch: true
    },
    grid: {
      spacing: 5,

    },
    css: true
  };

  @ViewChild('blockly') blocklyComponent: NgxBlocklyComponent;

  constructor(private formBuilder: FormBuilder, private vcRef: ViewContainerRef, private resolver: ComponentFactoryResolver) {
    const workspace = new Blockly.WorkspaceSvg(new Blockly.Options({}));
    const toolbox: NgxBlocklyToolbox = new NgxBlocklyToolbox(workspace);
    toolbox.nodes = [
      LOGIC_CATEGORY,
      LOOP_CATEGORY,
      MATH_CATEGORY,
      TEXT_CATEGORY,
      LISTS_CATEGORY,
      COLOUR_CATEGORY,
      new Separator(),
      VARIABLES_CATEGORY,
      FUNCTIONS_CATEGORY,
      new Separator(),
      new Category('Delete', '#ff0000'),
    ];
    this.config.toolbox = toolbox.toXML();
  }

  ngOnInit(): void {
    this.detailsFormGroup = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(this.NAME_MAX_LENGTH)]],
      description: ['', Validators.maxLength(this.DESCRIPTION_MAX_LENGTH)],
      isActive: [true]
    });
  }

  onCode(code: string) {
    console.log(code);
  }
}
