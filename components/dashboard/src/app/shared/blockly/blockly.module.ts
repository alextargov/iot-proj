import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlocklyComponent } from './blockly.component';

@NgModule({
    imports: [CommonModule],
    declarations: [BlocklyComponent],
    exports: [BlocklyComponent],
})
export class BlocklyModule {}
