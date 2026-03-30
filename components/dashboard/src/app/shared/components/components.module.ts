import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxBlocklyComponent1 } from './ngx-blockly/ngx-blockly.component';
import { MaterialModule } from '../material.module';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { ContentHeaderComponent } from './content-header/content-header.component';

import 'blockly/blocks';
import { BlocklyModule } from '../blockly';
import { LoginDialogComponent } from './login/login-dialog.component';
import { SchemaNodeEditorComponent } from './schema-node-editor/schema-node-editor.component';
import { CoreModule } from '../../core/core.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatToolbarModule,
        BrowserAnimationsModule,
        BrowserModule,
        MaterialModule,
        AppRoutingModule,
        BlocklyModule,
        ReactiveFormsModule,
        CoreModule,
    ],
    declarations: [
        NgxBlocklyComponent1,
        ContentHeaderComponent,
        LoginDialogComponent,
        SchemaNodeEditorComponent,
    ],
    exports: [
        CommonModule,
        NgxBlocklyComponent1,
        ContentHeaderComponent,
        LoginDialogComponent,
        SchemaNodeEditorComponent,
    ],
})
export class ComponentsModule {}
