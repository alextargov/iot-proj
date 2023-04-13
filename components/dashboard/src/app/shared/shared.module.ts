import { NgModule } from '@angular/core';

import { ComponentsModule } from './components/components.module';
import { ServicesModule } from './services/services.module';
import { GraphQLModule } from './graphql/graphql.module';

@NgModule({
    imports: [
        ComponentsModule,
        ServicesModule,
        GraphQLModule,
    ],
    exports: [
        ComponentsModule,
        ServicesModule,
        GraphQLModule,
    ]
})

export class SharedModule {}
