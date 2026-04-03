import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { Gridster, GridsterItem } from 'angular-gridster2';
import { MaterialModule } from 'src/app/shared/material.module';
import { BaseChartDirective } from 'ng2-charts';

// Widget components
import { GaugeWidgetComponent } from './widgets/gauge-widget/gauge-widget.component';
import { LineChartWidgetComponent } from './widgets/line-chart-widget/line-chart-widget.component';
import { StatusIndicatorWidgetComponent } from './widgets/status-indicator-widget/status-indicator-widget.component';
import { StatCardWidgetComponent } from './widgets/stat-card-widget/stat-card-widget.component';
import { TableWidgetComponent } from './widgets/table-widget/table-widget.component';
import { WidgetConfigDialogComponent } from './components/widget-config-dialog/widget-config-dialog.component';

@NgModule({
    declarations: [
        DashboardComponent,
        GaugeWidgetComponent,
        LineChartWidgetComponent,
        StatusIndicatorWidgetComponent,
        StatCardWidgetComponent,
        TableWidgetComponent,
        WidgetConfigDialogComponent,
    ],
    exports: [DashboardComponent],
    imports: [
        CoreModule,
        Gridster,
        GridsterItem,
        MaterialModule,
        ReactiveFormsModule,
        BaseChartDirective,
        SharedModule,
        DashboardRoutingModule,
    ],
})
export class DashboardModule {}
