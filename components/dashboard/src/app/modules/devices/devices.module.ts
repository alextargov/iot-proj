import { NgModule } from '@angular/core'

import { SharedModule } from '../../shared/shared.module'
import { CoreModule } from '../../core/core.module'

import { MaterialModule } from 'src/app/shared/material.module'
import { DevicesRoutingModule } from './devices-routing.module'
import { DeviceCreateComponent } from './device-create/device-create.component'
import { DevicesListComponent } from './devices-list/devices-list.component'
import { DeviceDeleteComponent } from './device-delete/device-delete.component'

@NgModule({
    declarations: [
        DeviceCreateComponent,
        DevicesListComponent,
        DeviceDeleteComponent,
    ],
    exports: [],
    imports: [CoreModule, MaterialModule, DevicesRoutingModule, SharedModule],
})
export class DevicesModule {}
