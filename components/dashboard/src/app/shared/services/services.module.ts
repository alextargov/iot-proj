import { NgModule } from '@angular/core';

import { ToastrModule } from 'ngx-toastr';

@NgModule({
    imports: [
        ToastrModule.forRoot({
            closeButton: true,
            progressBar: true,
        }),
    ],
})
export class ServicesModule {}
