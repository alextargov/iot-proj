import { NgModule } from '@angular/core';

import { ComponentsModule } from './components/components.module';
import { ServicesModule } from './services/services.module';

@NgModule({
    imports: [
        ComponentsModule,
        ServicesModule,
    ],
    exports: [
        ComponentsModule,
        ServicesModule,
    ]
})

export class SharedModule {}
