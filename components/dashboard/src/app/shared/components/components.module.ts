import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgxBlocklyComponent1 } from './ngx-blockly/ngx-blockly.component';
import { MaterialModule } from '../material.module';
import { ContentHeaderComponent } from './content-header/content-header.component';

import 'blockly/blocks';
import { BlocklyModule } from '../blockly';
import { LoginDialogComponent } from './login/login-dialog.component';
import { SchemaNodeEditorComponent } from './schema-node-editor/schema-node-editor.component';
import { CoreModule } from '../../core/core.module';
import { DeviceStatusPipe, WidgetStatusPipe, StatusConfigPipe } from '../pipes/status.pipe';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatToolbarModule,
        MaterialModule,
        BlocklyModule,
        ReactiveFormsModule,
        CoreModule,
    ],
    declarations: [
        NgxBlocklyComponent1,
        ContentHeaderComponent,
        LoginDialogComponent,
        SchemaNodeEditorComponent,
        DeviceStatusPipe,
        WidgetStatusPipe,
        StatusConfigPipe,
    ],
    exports: [
        CommonModule,
        NgxBlocklyComponent1,
        ContentHeaderComponent,
        LoginDialogComponent,
        SchemaNodeEditorComponent,
        DeviceStatusPipe,
        WidgetStatusPipe,
        StatusConfigPipe,
    ],
})
export class ComponentsModule {}
