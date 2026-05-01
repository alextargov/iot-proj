import { provideHttpClient, withInterceptorsFromDi, HttpHeaders } from '@angular/common/http';
import { NgModule, inject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
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

const errorLink = onError(({ graphQLErrors, networkError }: any) => {
    if (graphQLErrors) {
        graphQLErrors.forEach(({ message, path }: any) => {
            console.error(`[GraphQL Error]: Message: ${message}, Path: ${path}`);
        });
    }

    if (networkError) {
        console.error(`[Network Error]: ${networkError.message}`);
        if (networkError.status === 401 || networkError.statusCode === 401) {
            console.warn('Authentication failed - token may be expired. Please log in again.');
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
const createWsLink = (authService: AuthService) => {
    return new GraphQLWsLink(
        createClient({
            url: 'ws://localhost:8080/graphql',
            connectionParams: () => {
                const token = authService.getToken();
                return token ? { Authorization: `Bearer ${token}` } : {};
            },
            retryAttempts: 5,
            shouldRetry: () => true,
        })
    );
};

export function createDefaultApollo(
    httpLink: HttpLink,
    authService: AuthService
) {
    const cache = new InMemoryCache({});

    // create http
    const http = httpLink.create({
        uri: 'http://localhost:8080/graphql',
        withCredentials: true,
    });

    // Auth link that fetches token dynamically on each request
    const authLink = createAuthLink(authService);

    // WebSocket link for subscriptions
    const wsLink = createWsLink(authService);

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
    };
}

@NgModule({
    imports: [BrowserModule],
    providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideApollo(() => {
            const httpLink = inject(HttpLink);
            const authService = inject(AuthService);
            return createDefaultApollo(httpLink, authService);
        }),
    ],
})
export class GraphQLModule {}
