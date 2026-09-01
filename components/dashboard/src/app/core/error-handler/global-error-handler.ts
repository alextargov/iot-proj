import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { ToastrService } from '../../shared/services/toastr/toastr.service';

/**
 * Catches otherwise-unhandled runtime errors so the user sees a toast instead
 * of a silent failure, while still logging full detail to the console for
 * debugging. Injected lazily via the Injector to avoid a DI cycle at
 * bootstrap (ErrorHandler is constructed very early).
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private readonly injector: Injector) {}

    handleError(error: unknown): void {
        // Always log for debugging.
        console.error('[Unhandled Error]', error);

        // Ignore Angular's benign navigation-cancellation rejections and
        // chunk-load hiccups that resolve on retry — surfacing those as
        // toasts would be noise.
        const message = this.extractMessage(error);
        if (this.isIgnorable(message)) {
            return;
        }

        try {
            const zone = this.injector.get(NgZone);
            const toast = this.injector.get(ToastrService);
            zone.run(() =>
                toast.showError(
                    'An unexpected error occurred. Please try again.'
                )
            );
        } catch {
            // Injector not ready (very early failure) — console log above is
            // the best we can do.
        }
    }

    private extractMessage(error: unknown): string {
        if (!error) {
            return '';
        }
        if (error instanceof Error) {
            return error.message;
        }
        const rejection = (error as { rejection?: unknown }).rejection;
        if (rejection instanceof Error) {
            return rejection.message;
        }
        return String(error);
    }

    private isIgnorable(message: string): boolean {
        const m = message.toLowerCase();
        return (
            m.includes('navigation cancel') ||
            m.includes('loading chunk') ||
            m.includes('dynamically imported module')
        );
    }
}
