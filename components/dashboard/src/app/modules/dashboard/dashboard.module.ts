import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { Gridster, GridsterItem } from 'angular-gridster2';
import { MaterialModule } from 'src/app/shared/material.module';

@NgModule({
    declarations: [DashboardComponent],
    exports: [DashboardComponent],
    imports: [
        CoreModule,
        Gridster,
        GridsterItem,
        MaterialModule,

        SharedModule,
        DashboardRoutingModule,
    ],
})
export class DashboardModule {}
