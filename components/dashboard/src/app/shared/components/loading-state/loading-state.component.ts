import { Component, Input } from '@angular/core';

/** Reusable centered loading indicator with an optional message. */
@Component({
    standalone: false,
    selector: 'app-loading-state',
    templateUrl: './loading-state.component.html',
    styleUrls: ['./loading-state.component.scss'],
})
export class LoadingStateComponent {
    @Input() public message = 'Loading…';
    @Input() public diameter = 40;
}
