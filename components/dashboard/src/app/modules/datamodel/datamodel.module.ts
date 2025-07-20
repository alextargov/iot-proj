import { NgModule } from '@angular/core'

import { SharedModule } from '../../shared/shared.module'
import { CoreModule } from '../../core/core.module'

import { MaterialModule } from 'src/app/shared/material.module'
import { DatamodelRoutingModule } from './datamodel-routing.module'
import { DatamodelCreateComponent } from './datamodel-create/datamodel-create.component'
import { DatamodelListComponent } from './datamodel-list/datamodel-list.component'
import {MonacoEditorModule} from "ngx-monaco-editor";
import {DatamodelResolver} from "./datamodel-resolver.service";
import {DataModelDeleteComponent} from "./datamodel-delete/datamodel-delete.component";

@NgModule({
    declarations: [
        DatamodelCreateComponent,
        DatamodelListComponent,
        DataModelDeleteComponent,
    ],
    exports: [],
    imports: [
        CoreModule,
        MaterialModule,
        DatamodelRoutingModule,
        SharedModule,
        MonacoEditorModule.forRoot({
            baseUrl: '/assets/monaco/min/vs/loader.js' // 👈 must match output path above
        })
    ],
    providers: [
        DatamodelResolver
    ]
})
export class DatamodelModule {}
