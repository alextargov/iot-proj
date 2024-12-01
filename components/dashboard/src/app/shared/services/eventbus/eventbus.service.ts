import { Injectable } from '@angular/core';
import {Subject, Observable, filter, map} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EventBusService {
    private eventBus$ = new Subject<{ event: string; payload: any }>();

    public emit(event: string, payload: any) {
        this.eventBus$.next({ event, payload });
    }

    public on(event: string): Observable<any> {
        return this.eventBus$.asObservable().pipe(
            filter(e => e.event === event),
            map(e => e.payload)
        );
    }
}
