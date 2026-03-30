import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    AfterViewInit,
    Output,
    SimpleChanges,
    ViewChild,
    HostListener,
} from '@angular/core';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import 'blockly/blocks';
import { CustomBlock, BlocklyConfig, registerCustomBlocks } from './blockly-utils';

@Component({
    standalone: false,
    selector: 'ngx-blockly',
    template: `
        <div class="blockly-wrapper" #blocklyWrapper>
            <div #blocklyDiv class="blockly-container"></div>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
                width: 100%;
                height: 100%;
                min-height: 400px;
            }
            .blockly-wrapper {
                width: 100%;
                height: 100%;
                min-height: 400px;
                position: relative;
            }
            .blockly-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
            }
        `,
    ],
})
export class BlocklyComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('blocklyDiv') blocklyDiv!: ElementRef<HTMLDivElement>;
    @ViewChild('blocklyWrapper') blocklyWrapper!: ElementRef<HTMLDivElement>;

    @Input() config: BlocklyConfig = {};
    @Input() customBlocks: CustomBlock[] = [];
    @Input() readOnly = false;

    @Output() workspaceChange = new EventEmitter<any>();
    @Output() workspaceCreate = new EventEmitter<Blockly.WorkspaceSvg>();
    @Output() javascriptCode = new EventEmitter<string>();
    @Output() xmlCode = new EventEmitter<string>();

    public workspace: Blockly.WorkspaceSvg | null = null;
    private resizeTimeout: any;
    private finishedLoading = false;

    ngAfterViewInit(): void {
        setTimeout(() => this.initWorkspace(), 100);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['customBlocks'] && !changes['customBlocks'].firstChange) {
            this.reinitWorkspace();
        }
        if (changes['readOnly'] && this.workspace) {
            // Blockly doesn't support changing readOnly after init, would need reinit
        }
    }

    ngOnDestroy(): void {
        if (this.workspace) {
            this.workspace.dispose();
            this.workspace = null;
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.resize(), 200);
    }

    private initWorkspace(): void {
        if (!this.blocklyDiv?.nativeElement) {
            return;
        }

        // Register custom blocks before creating workspace
        registerCustomBlocks(this.customBlocks);

        const options = {
            ...this.config,
            readOnly: this.readOnly,
        } as Blockly.BlocklyOptions;

        this.workspace = Blockly.inject(this.blocklyDiv.nativeElement, options);

        this.workspace.addChangeListener((event: any) => {
            this.onWorkspaceChange(event);
        });

        this.workspaceCreate.emit(this.workspace);
        this.resize();
        this.finishedLoading = true;
    }

    private reinitWorkspace(): void {
        if (this.workspace) {
            const xml = this.toXml();
            this.workspace.dispose();
            this.initWorkspace();
            if (xml) {
                this.fromXml(xml);
            }
        }
    }

    private onWorkspaceChange(event: any): void {
        this.workspaceChange.emit(event);

        if (this.finishedLoading && this.workspace) {
            // Generate JavaScript code
            try {
                const code = javascriptGenerator.workspaceToCode(this.workspace);
                this.javascriptCode.emit(code);
            } catch (e) {
                console.error('Error generating code:', e);
            }

            // Generate XML
            try {
                const xml = Blockly.Xml.domToPrettyText(
                    Blockly.Xml.workspaceToDom(this.workspace)
                );
                this.xmlCode.emit(xml);
            } catch (e) {
                console.error('Error generating XML:', e);
            }
        }
    }

    public resize(): void {
        if (this.workspace) {
            Blockly.svgResize(this.workspace);
        }
    }

    public toXml(): string {
        if (!this.workspace) return '';
        return Blockly.Xml.domToPrettyText(
            Blockly.Xml.workspaceToDom(this.workspace)
        );
    }

    public fromXml(xml: string): void {
        if (!this.workspace) return;
        try {
            const parser = new DOMParser();
            const dom = parser.parseFromString(xml, 'text/xml');
            this.workspace.clear();
            Blockly.Xml.domToWorkspace(dom.documentElement, this.workspace);
        } catch (e) {
            console.error('Error loading XML:', e);
        }
    }

    public clear(): void {
        if (this.workspace) {
            this.workspace.clear();
        }
    }
}
