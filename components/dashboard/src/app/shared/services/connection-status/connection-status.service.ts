import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * Tracks the live GraphQL WebSocket connection state so the UI can show a
 * real-time status indicator. Updated by the graphql-ws client lifecycle
 * hooks wired up in GraphQLModule.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionStatusService {
    private readonly state$ = new BehaviorSubject<ConnectionState>('connecting');

    public readonly status: Observable<ConnectionState> =
        this.state$.asObservable();

    public get current(): ConnectionState {
        return this.state$.value;
    }

    public setConnecting(): void {
        this.state$.next('connecting');
    }

    public setConnected(): void {
        this.state$.next('connected');
    }

    public setDisconnected(): void {
        this.state$.next('disconnected');
    }
}
