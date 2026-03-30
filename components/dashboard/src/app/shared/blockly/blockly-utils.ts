import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

export { Blockly, javascriptGenerator, Order };

// Custom block base class
export abstract class CustomBlock {
    public type: string;
    public block: any;
    public class: any;
    public args: any[];

    constructor(type: string, blockMutator: any, ...args: any[]) {
        this.type = type;
        this.args = args;
    }

    public init(block: any): void {
        this.block = block;
        this.defineBlock();
    }

    public abstract defineBlock(): void;
    public abstract toJavaScriptCode(block: any): string | any[];
}

// Toolbox category (JSON-based for Blockly 10+)
export class Category {
    public blockTypes: string[];

    constructor(
        public name: string,
        public colour: string,
        blocks: string[] | CustomBlock[] = [],
        public custom?: string
    ) {
        // Handle both string[] and CustomBlock[]
        if (blocks.length > 0 && typeof blocks[0] === 'string') {
            this.blockTypes = blocks as string[];
        } else {
            this.blockTypes = (blocks as CustomBlock[]).map(b => b.type);
        }
    }

    toJSON(): any {
        const category: any = {
            kind: 'category',
            name: this.name,
            colour: this.colour,
        };

        if (this.custom) {
            category.custom = this.custom;
        } else {
            category.contents = this.blockTypes.map(type => ({
                kind: 'block',
                type: type,
            }));
        }

        return category;
    }

    // Keep XML for backwards compatibility
    toXML(): string {
        let xml = `<category name="${this.name}" colour="${this.colour}"`;
        if (this.custom) {
            xml += ` custom="${this.custom}"`;
        }
        xml += '>';
        for (const blockType of this.blockTypes) {
            xml += `<block type="${blockType}"></block>`;
        }
        xml += '</category>';
        return xml;
    }
}

// Separator
export class Separator {
    toJSON(): any {
        return { kind: 'sep' };
    }

    toXML(): string {
        return '<sep></sep>';
    }
}

// Button
export class Button {
    constructor(public text: string, public callbackKey: string) {}

    toJSON(): any {
        return {
            kind: 'button',
            text: this.text,
            callbackKey: this.callbackKey,
        };
    }

    toXML(): string {
        return `<button text="${this.text}" callbackKey="${this.callbackKey}"></button>`;
    }
}

// Label
export class Label {
    constructor(public text: string, public id: string) {}

    toJSON(): any {
        return {
            kind: 'label',
            text: this.text,
            id: this.id,
        };
    }

    toXML(): string {
        return `<label text="${this.text}" id="${this.id}"></label>`;
    }
}

// Standard categories with explicit block types (Blockly 10+ compatible)
export const LOGIC_CATEGORY = new Category('Logic', '#5b80a5', [
    'controls_if',
    'logic_compare',
    'logic_operation',
    'logic_negate',
    'logic_boolean',
    'logic_null',
    'logic_ternary',
]);

export const LOOP_CATEGORY = new Category('Loops', '#5ba55b', [
    'controls_repeat_ext',
    'controls_whileUntil',
    'controls_for',
    'controls_forEach',
    'controls_flow_statements',
]);

export const MATH_CATEGORY = new Category('Math', '#5b67a5', [
    'math_number',
    'math_arithmetic',
    'math_single',
    'math_trig',
    'math_constant',
    'math_number_property',
    'math_round',
    'math_on_list',
    'math_modulo',
    'math_constrain',
    'math_random_int',
    'math_random_float',
    'math_atan2',
]);

export const TEXT_CATEGORY = new Category('Text', '#5ba58c', [
    'text',
    'text_join',
    'text_append',
    'text_length',
    'text_isEmpty',
    'text_indexOf',
    'text_charAt',
    'text_getSubstring',
    'text_changeCase',
    'text_trim',
    'text_print',
    'text_prompt_ext',
]);

export const LISTS_CATEGORY = new Category('Lists', '#745ba5', [
    'lists_create_empty',
    'lists_create_with',
    'lists_repeat',
    'lists_length',
    'lists_isEmpty',
    'lists_indexOf',
    'lists_getIndex',
    'lists_setIndex',
    'lists_getSublist',
    'lists_split',
    'lists_sort',
]);

export const COLOUR_CATEGORY = new Category('Colour', '#a5745b', [
    'colour_picker',
    'colour_random',
    'colour_rgb',
    'colour_blend',
]);

// Variables and Functions use dynamic categories (special handling by Blockly)
export const VARIABLES_CATEGORY = new Category('Variables', '#a55b80', [], 'VARIABLE');
export const FUNCTIONS_CATEGORY = new Category('Functions', '#995ba5', [], 'PROCEDURE');

// Toolbox builder
export class BlocklyToolbox {
    public nodes: (Category | Separator | Button | Label)[] = [];

    toJSON(): any {
        return {
            kind: 'categoryToolbox',
            contents: this.nodes.map(node => node.toJSON()),
        };
    }

    // Keep XML for backwards compatibility
    toXML(): string {
        let xml = '<xml id="toolbox" style="display: none">';
        for (const node of this.nodes) {
            xml += node.toXML();
        }
        xml += '</xml>';
        return xml;
    }
}

// Config interface
export interface BlocklyConfig {
    toolbox?: string | object;
    trashcan?: boolean;
    readOnly?: boolean;
    move?: {
        scrollbars?: boolean;
        drag?: boolean;
        wheel?: boolean;
    };
    zoom?: {
        controls?: boolean;
        wheel?: boolean;
        startScale?: number;
        maxScale?: number;
        minScale?: number;
        scaleSpeed?: number;
        pinch?: boolean;
    };
    grid?: {
        spacing?: number;
        length?: number;
        colour?: string;
        snap?: boolean;
    };
    css?: boolean;
    oneBasedIndex?: boolean;
    [key: string]: any;
}

// Register custom blocks - uses Blockly 10+ compatible approach
export function registerCustomBlocks(blocks: CustomBlock[]): void {
    if (!blocks || blocks.length === 0) return;

    for (const customBlock of blocks) {
        // Skip if already registered
        if (Blockly.Blocks[customBlock.type]) {
            continue;
        }

        // Store the custom block instance data for later retrieval
        const blockData = {
            class: customBlock.class,
            args: customBlock.args,
        };

        Blockly.Blocks[customBlock.type] = {
            customBlockData: blockData,
            init: function () {
                const data = (this as any).customBlockData || blockData;
                const instance = new (data.class as any)(
                    customBlock.type,
                    null,
                    ...data.args
                );
                instance.init(this);
                (this as any).blockInstance = instance;
            },
        };

        (javascriptGenerator.forBlock as any)[customBlock.type] = function (
            block: any,
            generator: any
        ) {
            if (block.blockInstance) {
                return block.blockInstance.toJavaScriptCode(block);
            }
            return '';
        };
    }
}
