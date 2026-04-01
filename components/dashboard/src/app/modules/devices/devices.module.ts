import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

import { MaterialModule } from 'src/app/shared/material.module';
import { DevicesRoutingModule } from './devices-routing.module';
import { DeviceCreateComponent } from './device-create/device-create.component';
import { DevicesListComponent } from './devices-list/devices-list.component';
import { DeviceDeleteComponent } from './device-delete/device-delete.component';
import { DeviceDetailComponent } from './device-detail/device-detail.component';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ChartsModule } from '../../shared/components/charts/charts.module';

@NgModule({
    declarations: [
        DeviceCreateComponent,
        DevicesListComponent,
        DeviceDeleteComponent,
        DeviceDetailComponent,
    ],
    exports: [],
    imports: [
        CoreModule,
        MaterialModule,
        DevicesRoutingModule,
        SharedModule,
        MonacoEditorModule,
        ChartsModule,
    ],
})
export class DevicesModule {}
