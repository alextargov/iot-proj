import { Injectable } from '@angular/core';
import { Subject, Observable, filter, map } from 'rxjs';

/**
 * Type-safe event definitions for the EventBus.
 * Add new events here with their payload types.
 */
export interface EventMap {
    'user:login': { userId: string; username: string };
    'user:logout': void;
    'onLoginChange': Record<string, never>; // Legacy event for backward compatibility
    'onDashboardChange': Record<string, never>; // Legacy event for backward compatibility
    'device:created': { deviceId: string };
    'device:updated': { deviceId: string };
    'device:deleted': { deviceId: string };
    'widget:created': { widgetId: string };
    'widget:updated': { widgetId: string };
    'widget:deleted': { widgetId: string };
    'dashboard:refresh': void;
    'metric:recorded': { deviceId: string; metricName: string; value: number };
    'alert:triggered': { alertId: string; deviceId: string };
    'theme:changed': { theme: 'light' | 'dark' };
    'navigation:changed': { path: string };
}

export type EventName = keyof EventMap;

interface EventMessage<K extends EventName> {
    event: K;
    payload: EventMap[K];
}

@Injectable({ providedIn: 'root' })
export class EventBusService {
    private eventBus$ = new Subject<EventMessage<EventName>>();

    /**
     * Emit a typed event with its payload
     */
    public emit<K extends EventName>(event: K, payload: EventMap[K]): void {
        this.eventBus$.next({ event, payload } as EventMessage<EventName>);
    }

    /**
     * Subscribe to a typed event
     */
    public on<K extends EventName>(event: K): Observable<EventMap[K]> {
        return this.eventBus$.asObservable().pipe(
            filter((e): e is EventMessage<K> => e.event === event),
            map((e) => e.payload)
        );
    }
}
