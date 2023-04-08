import {CustomBlock, Blockly, NgxBlocklyGenerator} from "ngx-blockly";

export class AggregationBlock extends CustomBlock {
  private id: string;
  private name: string;
  private options: any[];

  constructor(type, obj, ...args) {
    super(type, null, obj);

    if (args.length > 0) {
      this.id = args[0].id;
      this.name = args[0].name
      this.options = args[0].options;
    }

    this.class = AggregationBlock;
  }

  public defineBlock() {
    this.block.setOutput(true, "Aggregation");
    this.block.setColour(15);

    if (this.options) {
      this.block.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(this.name, this.id))
        .appendField(new Blockly.FieldDropdown(this.options), 'MODE')

      return;
    }

    this.block.appendDummyInput()
      .appendField(new Blockly.FieldLabelSerializable(this.name, this.id))
  }

  public toJavaScriptCode(block: Blockly.Block): string | any[] {
    // TODO: Assemble JavaScript into code variable.
    var code = ``;

    return [code, Blockly[NgxBlocklyGenerator.JAVASCRIPT].ORDER_NONE]
  }
}
