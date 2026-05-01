import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

import { MaterialModule } from 'src/app/shared/material.module';
import { DatamodelRoutingModule } from './datamodel-routing.module';
import { DatamodelCreateComponent } from './datamodel-create/datamodel-create.component';
import { DatamodelListComponent } from './datamodel-list/datamodel-list.component';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { DataModelDeleteComponent } from './datamodel-delete/datamodel-delete.component';
import { TemplatePickerDialogComponent } from './template-picker-dialog/template-picker-dialog.component';
import { DataModelHistoryDialogComponent } from './datamodel-history-dialog/datamodel-history-dialog.component';

@NgModule({
    declarations: [
        DatamodelCreateComponent,
        DatamodelListComponent,
        DataModelDeleteComponent,
        TemplatePickerDialogComponent,
        DataModelHistoryDialogComponent,
    ],
    exports: [],
    imports: [
        CoreModule,
        MaterialModule,
        DatamodelRoutingModule,
        SharedModule,
        MonacoEditorModule.forRoot({
            baseUrl: '/assets/monaco-editor/min/vs',
        }),
    ],
})
export class DatamodelModule {}
