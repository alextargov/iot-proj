import { Component, Input } from '@angular/core';

export interface ContentHeaderButton {
    action?: Function;
    text?: string;
    icon?: string;
    color?: string;
}

@Component({
    standalone: false,
    selector: 'app-content-header',
    templateUrl: './content-header.component.html',
    styleUrls: ['./content-header.component.scss'],
})
export class ContentHeaderComponent {
    @Input() public buttons: ContentHeaderButton[];
    @Input() public title: string;

    constructor() {}
}
