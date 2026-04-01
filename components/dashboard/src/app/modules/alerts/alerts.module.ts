import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AlertsRoutingModule } from './alerts-routing.module';
import { AlertsListComponent } from './alerts-list/alerts-list.component';
import { AlertFormComponent } from './alert-form/alert-form.component';
import { AlertEventsComponent } from './alert-events/alert-events.component';

@NgModule({
    declarations: [
        AlertsListComponent,
        AlertFormComponent,
        AlertEventsComponent,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AlertsRoutingModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
    ],
    exports: [
        AlertsListComponent,
        AlertEventsComponent,
    ],
})
export class AlertsModule {}
