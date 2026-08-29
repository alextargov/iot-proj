import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

import { MaterialModule } from 'src/app/shared/material.module';
import { WidgetsComponent } from './widget-list/widgets.component';
import { WidgetsRoutingModule } from './widgets-routing.module';
import { WidgetCreateComponent } from './widget-create/widget-create.component';
import { WidgetDetailsComponent } from './widget-details/widget-details.component';

import 'blockly/blocks';
import { BlocklyModule } from '../../shared/blockly';
import { MatInputModule } from '@angular/material/input';
import { WidgetDeleteComponent } from './widget-delete/widget-delete.component';

// Widget create sub-components
import { WidgetScheduleFormComponent } from './widget-create/components/widget-schedule-form/widget-schedule-form.component';
import { WidgetTemplateSelectorComponent } from './widget-create/components/widget-template-selector/widget-template-selector.component';

@NgModule({
    declarations: [
        WidgetsComponent,
        WidgetCreateComponent,
        WidgetDetailsComponent,
        WidgetDeleteComponent,
        // Widget create sub-components
        WidgetScheduleFormComponent,
        WidgetTemplateSelectorComponent,
    ],
    exports: [
        WidgetsComponent,
        WidgetCreateComponent,
        WidgetDetailsComponent,
        WidgetDeleteComponent,
    ],
    imports: [
        CoreModule,
        MaterialModule,
        BlocklyModule,
        MatInputModule,

        WidgetsRoutingModule,
        SharedModule,
    ],
})
export class WidgetsModule {}
