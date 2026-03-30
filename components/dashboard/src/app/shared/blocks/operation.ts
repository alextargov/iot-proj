import { CustomBlock, Blockly } from '../blockly';

export interface IOperation {
    id: string;
    name: string;
    hasInput?: boolean;
    hasOutputConnection: boolean;
    hasPrevConnection: boolean;
    hasNextConnection: boolean;
    additionalText?: string;
    hasSecondInput?: boolean;
}

export class OperationBlock extends CustomBlock {
    private readonly id: string;
    private readonly name: string;
    private readonly hasInput: boolean;
    private readonly hasOutputConnection: boolean;
    private readonly hasPrevConnection: boolean;
    private readonly hasNextConnection: boolean;
    private readonly additionalText: string;
    private readonly hasSecondInput: boolean;

    constructor(type: string, obj: any, ...args: any[]) {
        super(type, null, obj);

        // Data comes from obj (second parameter) or args[0]
        const config = obj || (args.length > 0 ? args[0] : {});

        this.id = config.id;
        this.name = config.name;
        this.hasInput = config.hasInput;
        this.hasOutputConnection = config.hasOutputConnection;
        this.hasPrevConnection = config.hasPrevConnection;
        this.hasNextConnection = config.hasNextConnection;
        this.additionalText = config.additionalText;
        this.hasSecondInput = config.hasSecondInput;

        this.class = OperationBlock;
    }

    public defineBlock() {
        this.block.setColour(200);

        if (this.hasInput) {
            this.block
                .appendValueInput('operation')
                .setCheck('String')
                .appendField(
                    new Blockly.FieldLabelSerializable(this.name, this.id)
                );
            this.block.setInputsInline(true);
        } else {
            this.block
                .appendDummyInput()
                .appendField(
                    new Blockly.FieldLabelSerializable(this.name, this.id)
                );
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
                );
        }

        if (this.hasOutputConnection) {
            this.block.setOutput(true, 'Operation');
        }

        if (this.hasPrevConnection) {
            this.block.setPreviousStatement(true, 'Operation');
        }

        if (this.hasNextConnection) {
            this.block.setNextStatement(true, 'Operation');
        }
    }

    public toJavaScriptCode(block: any): string | any[] {
        let code = ``;

        const textChildren = block
            .getChildren(true)
            .map((child: any) => `'${child.getFieldValue('TEXT')}'`);
        if (this.hasInput && textChildren.length) {
            code = `await setOperation("${this.id}", [${textChildren.join(
                ', '
            )}])`;
        }
        return code;
    }
}
