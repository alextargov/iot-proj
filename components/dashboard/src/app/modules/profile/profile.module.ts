import { NgModule } from '@angular/core'

import { SharedModule } from '../../shared/shared.module'
import { CoreModule } from '../../core/core.module'

import { MaterialModule } from 'src/app/shared/material.module'
import { ProfileRoutingModule } from './profile-routing.module'
import { ProfileComponent } from './profile.component'

@NgModule({
    declarations: [ProfileComponent],
    exports: [ProfileComponent],
    imports: [CoreModule, MaterialModule, SharedModule, ProfileRoutingModule],
})
export class ProfileModule {}
