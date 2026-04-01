import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import { DeviceMetricsChartComponent } from './device-metrics-chart/device-metrics-chart.component';

@NgModule({
    declarations: [DeviceMetricsChartComponent],
    imports: [
        CommonModule,
        FormsModule,
        BaseChartDirective,
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatFormFieldModule,
    ],
    providers: [
        provideCharts(withDefaultRegisterables()),
    ],
    exports: [DeviceMetricsChartComponent],
})
export class ChartsModule {}
