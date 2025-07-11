import { NgModule } from '@angular/core'

import { SharedModule } from '../../shared/shared.module'
import { CoreModule } from '../../core/core.module'
import { LoginComponent } from './login.component'
import { LoginRoutingModule } from './login-routing.module'
import { GridsterModule } from 'angular-gridster2'
import { MaterialModule } from 'src/app/shared/material.module'

@NgModule({
    declarations: [LoginComponent],
    exports: [LoginComponent],
    imports: [
        CoreModule,
        GridsterModule,
        MaterialModule,

        SharedModule,
        LoginRoutingModule,
    ],
})
export class LoginModule {}
