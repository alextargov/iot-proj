import { NgModule } from '@angular/core';

import { ApiService } from './api/api.service';
import { AppConfigService } from './app-config/app-config.service';
import { DeviceService } from './device/device.service';
import {ToastrService} from "./toastr/toastr.service";
import {ToastrModule} from "ngx-toastr";
// import { BroadcasterService } from './broadcaster/broadcaster.service';
// import { LoadingOverlayService } from './loading-overlay/loading-overlay.service';

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
        ToastrService,

        // BroadcasterService,
        // LoadingOverlayService,
    ],
})
export class ServicesModule {}
