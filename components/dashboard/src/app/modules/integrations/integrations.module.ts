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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

import { SharedModule } from '../../shared/shared.module';
import { IntegrationsRoutingModule } from './integrations-routing.module';
import { IntegrationsListComponent } from './integrations-list/integrations-list.component';
import { IntegrationFormComponent } from './integration-form/integration-form.component';

@NgModule({
    declarations: [IntegrationsListComponent, IntegrationFormComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        IntegrationsRoutingModule,
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
        MatPaginatorModule,
        MatSortModule,
    ],
})
export class IntegrationsModule {}
