import { ToastrService as ToasterSvc } from 'ngx-toastr'
import { Injectable } from '@angular/core'

@Injectable()
export class ToastrService {
    constructor(private toastr: ToasterSvc) {}

    public showSuccess(msg: string) {
        this.toastr.success(msg)
    }

    public showError(msg: string) {
        this.toastr.error(msg)
    }
}
