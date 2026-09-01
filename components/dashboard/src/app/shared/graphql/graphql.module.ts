import { provideHttpClient, withInterceptorsFromDi, HttpHeaders } from '@angular/common/http';
import { NgModule, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import {
    ApolloLink,
    InMemoryCache,
    split,
} from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { createClient } from 'graphql-ws';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth/auth.service';
import { ToastrService } from '../services/toastr/toastr.service';
import { ConnectionStatusService } from '../services/connection-status/connection-status.service';

// Operations whose errors are handled inline by callers (e.g. login shows its
// own message); skip the global toast for these to avoid duplicate feedback.
const SILENT_OPERATIONS = new Set(['Login', 'Register']);

const isAuthError = (err: {
    extensions?: Record<string, unknown> | null;
    message?: string;
}): boolean => {
    const code = (err.extensions?.['code'] as string | undefined)?.toUpperCase();
    if (code === 'UNAUTHENTICATED' || code === 'UNAUTHORIZED') {
        return true;
    }
    const msg = (err.message ?? '').toLowerCase();
    return msg.includes('unauthenticated') || msg.includes('unauthorized');
};

const createErrorLink = (
    authService: AuthService,
    toast: ToastrService,
    router: Router,
    ngZone: NgZone
) =>
    onError(({ graphQLErrors, networkError, operation }: any) => {
        const opName: string = operation?.operationName ?? '';
        const silent = SILENT_OPERATIONS.has(opName);

        const redirectToLogin = () => {
            authService.logout();
            ngZone.run(() => {
                toast.showError('Your session has expired. Please log in again.');
                router.navigate(['/login']);
            });
        };

        if (graphQLErrors?.length) {
            let authFailure = false;
            for (const err of graphQLErrors) {
                console.error(
                    `[GraphQL Error]: ${err.message} (op: ${opName}, path: ${err.path})`
                );
                if (isAuthError(err)) {
                    authFailure = true;
                }
            }
            if (authFailure) {
                redirectToLogin();
                return;
            }
            if (!silent) {
                const first = graphQLErrors[0];
                ngZone.run(() =>
                    toast.showError(first.message || 'Something went wrong')
                );
            }
        }

        if (networkError) {
            console.error(`[Network Error]: ${networkError.message}`);
            const status =
                (networkError as any).status ??
                (networkError as any).statusCode ??
                undefined;
            if (status === 401 || status === 403) {
                redirectToLogin();
                return;
            }
            if (!silent) {
                ngZone.run(() =>
                    toast.showError(
                        'Cannot reach the server. Check your connection and try again.'
                    )
                );
            }
        }
    });

// Dynamic auth context - fetches token on EACH request
const createAuthLink = (authService: AuthService) =>
    setContext((_, { headers }: any) => {
        // Get fresh token for each request
        const authToken = authService.getToken();

        return {
            headers: new HttpHeaders({
                Accept: 'charset=utf-8',
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            }),
        };
    });

// Create WebSocket link for subscriptions
const createWsLink = (
    authService: AuthService,
    connection: ConnectionStatusService,
    ngZone: NgZone
) => {
    const notify = (fn: () => void) => ngZone.run(fn);
    return new GraphQLWsLink(
        createClient({
            url: environment.wsUrl,
            connectionParams: () => {
                const token = authService.getToken();
                return token ? { Authorization: `Bearer ${token}` } : {};
            },
            retryAttempts: 5,
            shouldRetry: () => true,
            on: {
                connecting: () => notify(() => connection.setConnecting()),
                connected: () => notify(() => connection.setConnected()),
                closed: () => notify(() => connection.setDisconnected()),
                error: () => notify(() => connection.setDisconnected()),
            },
        })
    );
};

export function createDefaultApollo(
    httpLink: HttpLink,
    authService: AuthService,
    toast: ToastrService,
    router: Router,
    connection: ConnectionStatusService,
    ngZone: NgZone
) {
    const cache = new InMemoryCache({});

    // create http
    const http = httpLink.create({
        uri: environment.apiUrl,
        withCredentials: true,
    });

    // Auth link that fetches token dynamically on each request
    const authLink = createAuthLink(authService);

    // Global error handling: toasts + 401 redirect
    const errorLink = createErrorLink(authService, toast, router, ngZone);

    // WebSocket link for subscriptions (tracks connection status)
    const wsLink = createWsLink(authService, connection, ngZone);

    // HTTP link with auth and error handling
    const httpLinkChain = ApolloLink.from([authLink, errorLink, http]);

    // Split link: use WebSocket for subscriptions, HTTP for queries/mutations
    const splitLink = split(
        ({ query }) => {
            const definition = getMainDefinition(query);
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
            );
        },
        wsLink,
        httpLinkChain
    );

    return {
        connectToDevTools: !environment.production,
        assumeImmutableResults: true,
        cache,
        link: splitLink,
        defaultOptions: {
            watchQuery: {
                errorPolicy: 'all' as const,
            },
        },
        shouldBatch: true,
        runInZone: ngZone,
    };
}

@NgModule({
    providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideApollo(() => {
            const httpLink = inject(HttpLink);
            const authService = inject(AuthService);
            const toast = inject(ToastrService);
            const router = inject(Router);
            const connection = inject(ConnectionStatusService);
            const ngZone = inject(NgZone);
            return createDefaultApollo(
                httpLink,
                authService,
                toast,
                router,
                connection,
                ngZone
            );
        }),
    ],
})
export class GraphQLModule {}
