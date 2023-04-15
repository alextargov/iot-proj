import { NgModule } from '@angular/core'

import { SharedModule } from '../../shared/shared.module'
import { CoreModule } from '../../core/core.module'

import { MaterialModule } from 'src/app/shared/material.module'
import { WidgetsComponent } from './widget-list/widgets.component'
import { WidgetsRoutingModule } from './widgets-routing.module'
import { WidgetCreateComponent } from './widget-create/widget-create.component'
import { WidgetDetailsComponent } from './widget-details/widget-details.component'

import 'blockly/blocks'
import { NgxBlocklyModule } from 'ngx-blockly'
import { MatInputModule } from '@angular/material/input'

@NgModule({
    declarations: [
        WidgetsComponent,
        WidgetCreateComponent,
        WidgetDetailsComponent,
    ],
    exports: [WidgetsComponent, WidgetCreateComponent, WidgetDetailsComponent],
    imports: [
        CoreModule,
        MaterialModule,
        NgxBlocklyModule,
        MatInputModule,

        WidgetsRoutingModule,
        SharedModule,
    ],
})
export class WidgetsModule {}
