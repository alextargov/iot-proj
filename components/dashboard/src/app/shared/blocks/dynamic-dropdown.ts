import { CustomBlock, Blockly, Order } from '../blockly';

export class DynamicDropdownBlock extends CustomBlock {
    public data: any[];
    public readonly id: string;
    public readonly isOutput: boolean;

    constructor(type: string, obj: any, ...args: any[]) {
        super(type, null, obj);

        // Data comes from obj (second parameter) or args[0]
        const config = obj || (args.length > 0 ? args[0] : {});

        this.id = config.id;
        this.data = config.data || [];
        this.isOutput = config.isOutput;

        // Ensure data is never empty (Blockly requires at least one option)
        if (!this.data || this.data.length === 0) {
            this.data = [['No devices available', 'none']];
        }

        this.class = DynamicDropdownBlock;
    }

    public defineBlock() {
        this.block.setInputsInline(true);

        if (this.isOutput) {
            this.block.setOutput(true, null);
            this.block
                .appendValueInput('aggregation')
                .setCheck('Aggregation')
                .appendField(new Blockly.FieldDropdown(this.data), this.id);
            this.block.setColour(0);
        } else {
            this.block
                .appendValueInput('aggregation')
                .setCheck('Operation')
                .appendField(new Blockly.FieldDropdown(this.data), this.id);
            this.block.setPreviousStatement(true, null);
            this.block.setNextStatement(true, null);
            this.block.setColour(180);
        }
    }

    public toJavaScriptCode(block: any): string | any[] {
        const deviceId = block.getFieldValue(this.id);

        const aggregationId = this.block.getChildren(true).length
            ? (this.block.getChildren(true)[0] as any).blockInstance.id
            : null;
        let code = `deviceID: ${deviceId}; Aggregation: ${aggregationId}; isOutput ${this.isOutput}`;
        if (this.isOutput) {
            code = `await getDevice("${deviceId}")`;
            if (aggregationId) {
                code = `await getDeviceWithAggregation("${deviceId}", "${aggregationId}")`;
            }
        } else {
            code = `await setDevice("${deviceId}")`;

            if (aggregationId) {
                code = `await setDeviceOperation("${deviceId}", "${aggregationId}")\n`;
            }
        }

        if (this.isOutput) {
            return [code, Order.NONE];
        } else {
            return code;
        }
    }
}
