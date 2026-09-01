import { Component } from '@angular/core';
import {
    ConnectionStatusService,
    ConnectionState,
} from '../../services/connection-status/connection-status.service';

/**
 * Small live indicator of the realtime (WebSocket) connection state, driven by
 * ConnectionStatusService. Shows a coloured dot + label with a tooltip.
 */
@Component({
    standalone: false,
    selector: 'app-connection-status',
    templateUrl: './connection-status.component.html',
    styleUrls: ['./connection-status.component.scss'],
})
export class ConnectionStatusComponent {
    constructor(public readonly connection: ConnectionStatusService) {}

    public label(state: ConnectionState): string {
        switch (state) {
            case 'connected':
                return 'Live';
            case 'connecting':
                return 'Connecting…';
            default:
                return 'Offline';
        }
    }

    public tooltip(state: ConnectionState): string {
        switch (state) {
            case 'connected':
                return 'Realtime updates are active';
            case 'connecting':
                return 'Connecting to realtime updates…';
            default:
                return 'Realtime updates are unavailable — data may be stale';
        }
    }
}
