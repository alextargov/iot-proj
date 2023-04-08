import {
  CustomBlock,
  Blockly,
  NgxBlocklyGenerator,
} from "ngx-blockly";


export class DynamicDropdownBlock extends CustomBlock {
  public data: string[][]
  public readonly id: string;
  public readonly isOutput: boolean

  constructor(type, obj, ...args) {
    super(type, null, obj);

    if (args.length > 0) {
      this.id = args[0].id;
      this.data = args[0].data;
      this.isOutput = args[0].isOutput;
    }

    this.class = DynamicDropdownBlock;
  }

  public defineBlock() {
    this.block.setInputsInline(true);

    if (this.isOutput) {
      this.block.setOutput(true, null)
      this.block.appendValueInput("aggregation")
        .setCheck("Aggregation")
        .appendField(new Blockly.FieldDropdown(this.data), this.id);
        this.block.setColour(0);
    } else {
      this.block.appendValueInput("aggregation")
        .setCheck("Operation")
        .appendField(new Blockly.FieldDropdown(this.data), this.id);
      this.block.setPreviousStatement(true, null);
      this.block.setNextStatement(true, null);
      this.block.setColour(180)
    }
  }

  public toJavaScriptCode(block: Blockly.Block): string | any[] {
    // TODO: Assemble JavaScript into code variable.
    const deviceId = block.getFieldValue(this.id);

    const aggregationId = this.block.getChildren(true).length ? (this.block.getChildren(true)[0] as any).blockInstance.id : null;
    let code = `deviceID: ${deviceId}; Aggregation: ${aggregationId}; isOutput ${this.isOutput}`;
    if (this.isOutput) {
      code = `await getDevice("${deviceId}")`
      if (aggregationId) {
        code = `await getDeviceWithAggregation("${deviceId}", "${aggregationId}")`
      }
    } else {
      code = `await setDevice("${deviceId}")`

      if (aggregationId) {
        code = `await setDeviceOperation("${deviceId}", "${aggregationId}")\n`
      }
    }


    if (this.isOutput) {
      return [code, Blockly[NgxBlocklyGenerator.JAVASCRIPT].ORDER_NONE]
    } else {
      return code
    }
    // return code;
    // TODO: Change ORDER_NONE to the correct strength.
  }
}
