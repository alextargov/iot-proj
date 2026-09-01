import { ToastrService as ToasterSvc } from 'ngx-toastr';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastrService {
    constructor(private toastr: ToasterSvc) {}

    public showSuccess(msg: string, title?: string) {
        this.toastr.success(msg, title);
    }

    public showError(msg: string, title?: string) {
        this.toastr.error(msg, title);
    }

    public showInfo(msg: string, title?: string) {
        this.toastr.info(msg, title);
    }

    public showWarning(msg: string, title?: string) {
        this.toastr.warning(msg, title);
    }
}
