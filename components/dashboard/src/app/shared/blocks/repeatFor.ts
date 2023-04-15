import { CustomBlock, Blockly } from 'ngx-blockly'
import { javascriptGenerator } from 'blockly/javascript'
export enum RepeatTypes {
    'SECONDS',
    'MINUTES',
    'HOURS',
    'DAYS',
}

export class RepeatForBlock extends CustomBlock {
    private readonly id: string

    constructor(type, obj, ...args) {
        super(type, null, obj)

        if (args.length > 0) {
            this.id = args[0].id
        }

        this.class = RepeatForBlock
    }

    public defineBlock() {
        this.block.setColour(200)

        this.block
            .appendDummyInput()
            .appendField('repeat every')
            .appendField(new Blockly.FieldNumber(1), 'intervalValue')
            .appendField(
                new Blockly.FieldDropdown([
                    ['seconds', RepeatTypes.SECONDS.toString()],
                    ['minutes', RepeatTypes.MINUTES.toString()],
                    ['hours', RepeatTypes.HOURS.toString()],
                    ['days', RepeatTypes.DAYS.toString()],
                ]),
                'intervalType'
            )
        this.block
            .appendStatementInput('do')
            .setCheck(null)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField('do')
        this.block.setInputsInline(false)
        this.block.setPreviousStatement(true, null)
        this.block.setNextStatement(true, null)
        this.block.setColour(230)
        this.block.setTooltip('')
        this.block.setHelpUrl('')
    }

    public toJavaScriptCode(block: Blockly.Block): string | any[] {
        // TODO: Assemble JavaScript into code variable.

        const intervalValue = +this.block.getField('intervalValue').getValue()
        const intervalType = this.block.getField('intervalType').getValue()
        let statementToCode = javascriptGenerator.statementToCode(block, 'do')

        return `
setInterval(async () => {
   ${statementToCode}
}, ${this.calculateInterval(intervalType, intervalValue)})`
    }

    public calculateInterval(
        intervalType: string,
        intervalValue: number
    ): number {
        switch (intervalType) {
            case RepeatTypes.SECONDS.toString():
                return intervalValue * 1000
            case RepeatTypes.MINUTES.toString():
                return intervalValue * 1000 * 60
            case RepeatTypes.HOURS.toString():
                return intervalValue * 1000 * 60 * 60
            case RepeatTypes.DAYS.toString():
                return intervalValue * 1000 * 60 * 60 * 24
            default:
                return undefined
        }
    }
}
