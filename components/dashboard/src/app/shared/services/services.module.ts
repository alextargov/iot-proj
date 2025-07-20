import { NgModule } from '@angular/core'

import { ApiService } from './api/api.service'
import { AppConfigService } from './app-config/app-config.service'
import { DeviceService } from './device/device.service'
import { ToastrService } from './toastr/toastr.service'
import { ToastrModule } from 'ngx-toastr'
import {EventBusService} from "./eventbus/eventbus.service";
import {DatamodelService} from "./datamodel/datamodel.service";
import {JsonSchemaService} from "./jsonschema/jsonschema.service";

@NgModule({
    imports: [
        ToastrModule.forRoot({
            closeButton: true,
            progressBar: true,
        }),
    ],
    providers: [
        ApiService,
        AppConfigService,
        DeviceService,
        DatamodelService,
        ToastrService,
        EventBusService,
        JsonSchemaService
    ],
})
export class ServicesModule {}
