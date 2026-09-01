import { Component, Input } from '@angular/core';

/**
 * Reusable empty-state block: icon + message + optional call-to-action button.
 * Replaces the ad-hoc "No … yet" markup duplicated across list modules.
 */
@Component({
    standalone: false,
    selector: 'app-empty-state',
    templateUrl: './empty-state.component.html',
    styleUrls: ['./empty-state.component.scss'],
})
export class EmptyStateComponent {
    @Input() public icon = 'inbox';
    @Input() public title = 'Nothing here yet';
    @Input() public message = '';
    @Input() public actionText?: string;
    @Input() public actionIcon?: string;
    @Input() public actionDisabled = false;

    /** Emits when the CTA button is clicked. */
    @Input() public action?: () => void;

    public onAction(): void {
        if (this.action && !this.actionDisabled) {
            this.action();
        }
    }
}
