import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

import { MaterialModule } from 'src/app/shared/material.module';
import { DevicesRoutingModule } from './devices-routing.module';
import { DeviceCreateComponent } from './device-create/device-create.component';
import { DevicesListComponent } from "./devices-list/devices-list.component";


@NgModule({
    declarations: [
      DeviceCreateComponent,
      DevicesListComponent,
    ],
    exports: [
    ],
    imports: [
        CoreModule,
        MaterialModule,

        DevicesRoutingModule,
        SharedModule,
    ]
})
export class DevicesModule {}
