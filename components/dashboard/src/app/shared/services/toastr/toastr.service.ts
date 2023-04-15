import { ToastrService as ToasterSvc } from 'ngx-toastr'
import { Injectable } from '@angular/core'

@Injectable()
export class ToastrService {
    constructor(private toastr: ToasterSvc) {}

    showSuccess(msg) {
        this.toastr.success(msg)
    }
}
