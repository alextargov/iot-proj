import { CustomBlock, Blockly } from 'ngx-blockly'

export interface IOperation {
    id: string
    name: string
    hasInput?: boolean
    hasOutputConnection: boolean
    hasPrevConnection: boolean
    hasNextConnection: boolean
    additionalText?: string
    hasSecondInput?: boolean
}

export class OperationBlock extends CustomBlock {
    private readonly id: string
    private readonly name: string
    private readonly hasInput: boolean
    private readonly hasOutputConnection: boolean
    private readonly hasPrevConnection: boolean
    private readonly hasNextConnection: boolean
    private readonly additionalText: string
    private readonly hasSecondInput: boolean

    constructor(type, obj, ...args) {
        super(type, null, obj)

        if (args.length > 0) {
            this.id = args[0].id
            this.name = args[0].name
            this.hasInput = args[0].hasInput
            this.hasOutputConnection = args[0].hasOutputConnection
            this.hasPrevConnection = args[0].hasPrevConnection
            this.hasNextConnection = args[0].hasNextConnection
            this.additionalText = args[0].additionalText
            this.hasSecondInput = args[0].hasSecondInput
        }

        this.class = OperationBlock
    }

    public defineBlock() {
        this.block.setColour(200)

        if (this.hasInput) {
            this.block
                .appendValueInput('operation')
                .setCheck('String')
                .appendField(
                    new Blockly.FieldLabelSerializable(this.name, this.id)
                )
            this.block.setInputsInline(true)
        } else {
            this.block
                .appendDummyInput()
                .appendField(
                    new Blockly.FieldLabelSerializable(this.name, this.id)
                )
        }

        if (this.hasSecondInput && this.additionalText) {
            this.block
                .appendValueInput('additional')
                .setCheck('String')
                .appendField(
                    new Blockly.FieldLabelSerializable(
                        this.additionalText,
                        this.id
                    )
                )
        }

        if (this.hasOutputConnection) {
            this.block.setOutput(true, 'Operation')
        }

        if (this.hasPrevConnection) {
            this.block.setPreviousStatement(true, 'Operation')
        }

        if (this.hasNextConnection) {
            this.block.setNextStatement(true, 'Operation')
        }
    }

    public toJavaScriptCode(block: Blockly.Block): string | any[] {
        // TODO: Assemble JavaScript into code variable.
        let code = ``

        const textChildren = block
            .getChildren(true)
            .map((child) => `'${child.getFieldValue('TEXT')}'`)
        if (this.hasInput && textChildren.length) {
            code = `await setOperation("${this.id}", [${textChildren.join(
                ', '
            )}])`
        }
        return code
        // return [code, Blockly[NgxBlocklyGenerator.JAVASCRIPT].ORDER_NONE]
    }
}
