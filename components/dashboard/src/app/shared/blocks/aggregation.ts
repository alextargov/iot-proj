import { CustomBlock, Blockly, Order } from '../blockly';

export enum AggregationType {
    SUM = 'SUM',
    AVERAGE = 'AVERAGE',
    LAST_WEEK = 'LAST_WEEK',
}

export class AggregationBlock extends CustomBlock {
    private id: string;
    private name: string;
    private options: any[];

    constructor(type: string, obj: any, ...args: any[]) {
        super(type, null, obj);

        // Data comes from obj (second parameter) or args[0]
        const config = obj || (args.length > 0 ? args[0] : {});

        this.id = config.id;
        this.name = config.name;
        this.options = config.options;

        this.class = AggregationBlock;
    }

    public defineBlock() {
        this.block.setOutput(true, 'Aggregation');
        this.block.setColour(15);

        if (this.options) {
            this.block
                .appendDummyInput()
                .appendField(
                    new Blockly.FieldLabelSerializable(this.name, this.id)
                )
                .appendField(new Blockly.FieldDropdown(this.options), 'MODE');

            return;
        }

        this.block
            .appendDummyInput()
            .appendField(
                new Blockly.FieldLabelSerializable(this.name, this.id)
            );
    }

    public toJavaScriptCode(block: any): string | any[] {
        const mode = block.getFieldValue('MODE') || AggregationType.SUM;
        const code = `await getAggregation("${this.id}", "${mode}")`;
        return [code, Order.FUNCTION_CALL];
    }
}
