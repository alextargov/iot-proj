import { Component, ViewChild } from '@angular/core';
import {
    BlocklyComponent,
    BlocklyConfig,
    BlocklyToolbox,
    CustomBlock,
    Button,
    Label,
    Category,
    Separator,
    LOGIC_CATEGORY,
    LOOP_CATEGORY,
    MATH_CATEGORY,
    TEXT_CATEGORY,
    LISTS_CATEGORY,
    COLOUR_CATEGORY,
    VARIABLES_CATEGORY,
    FUNCTIONS_CATEGORY,
} from '../../blockly';

@Component({
    standalone: false,
    selector: 'app-ngx-blockly--',
    templateUrl: './ngx-blockly.component.html',
    styleUrls: ['./ngx-blockly.component.css'],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class NgxBlocklyComponent1 {
    public readOnly = false;

    public customBlocks: CustomBlock[] = [];
    public button: Button = new Button('asd', 'asdasd');
    public label: Label = new Label('asd', 'asdasd');

    public config: BlocklyConfig = {
        toolbox:
            '<xml id="toolbox" style="display: none">' +
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
        move: {
            scrollbars: true,
            wheel: true,
        },
    };

    @ViewChild('blockly1') blocklyComponent: BlocklyComponent;

    constructor() {
        const toolbox = new BlocklyToolbox();
        toolbox.nodes = [
            LOGIC_CATEGORY,
            new Category('bla', '#ff0000', this.customBlocks),
            LOOP_CATEGORY,
            MATH_CATEGORY,
            TEXT_CATEGORY,
            LISTS_CATEGORY,
            COLOUR_CATEGORY,
            new Separator(),
            VARIABLES_CATEGORY,
            FUNCTIONS_CATEGORY,
        ];
        this.config.toolbox = toolbox.toXML();
    }

    onCode(code: string) {
        console.log(code);
    }
}
