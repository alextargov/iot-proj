import { Component, Input } from '@angular/core';

/** Reusable error block: icon + message + optional Retry button. */
@Component({
    standalone: false,
    selector: 'app-error-state',
    templateUrl: './error-state.component.html',
    styleUrls: ['./error-state.component.scss'],
})
export class ErrorStateComponent {
    @Input() public icon = 'error_outline';
    @Input() public title = 'Something went wrong';
    @Input() public message = '';
    @Input() public retryText = 'Retry';
    @Input() public retry?: () => void;

    public onRetry(): void {
        if (this.retry) {
            this.retry();
        }
    }
}
