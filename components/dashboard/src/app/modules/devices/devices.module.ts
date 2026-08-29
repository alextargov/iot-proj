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

// Device create sub-components
import { DeviceMetadataFormComponent } from './device-create/components/device-metadata-form/device-metadata-form.component';
import { DeviceAuthFormComponent } from './device-create/components/device-auth-form/device-auth-form.component';
import { DeviceDatamodelFormComponent } from './device-create/components/device-datamodel-form/device-datamodel-form.component';

@NgModule({
    declarations: [
        DeviceCreateComponent,
        DevicesListComponent,
        DeviceDeleteComponent,
        DeviceDetailComponent,
        // Device create sub-components
        DeviceMetadataFormComponent,
        DeviceAuthFormComponent,
        DeviceDatamodelFormComponent,
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
