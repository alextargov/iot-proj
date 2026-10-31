import { Component, Input } from '@angular/core';

/**
 * Reusable shimmer placeholder. Render one or more blocks while content loads
 * so the surrounding layout stays stable (no empty-state flash, no full-page
 * spinner). Width/height accept any CSS length; `count` repeats the block.
 */
@Component({
    standalone: false,
    selector: 'app-skeleton',
    templateUrl: './skeleton.component.html',
    styleUrls: ['./skeleton.component.scss'],
})
export class SkeletonComponent {
    /** CSS width of each block, e.g. "100%", "4rem". */
    @Input() public width = '100%';
    /** CSS height of each block. */
    @Input() public height = '1rem';
    /** Border radius; defaults to a small pill. */
    @Input() public radius = '4px';
    /** Number of stacked blocks to render. */
    @Input() public count = 1;

    public get blocks(): number[] {
        return Array.from({ length: Math.max(1, this.count) });
    }
}
