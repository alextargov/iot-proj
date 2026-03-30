import { provideHttpClient, withInterceptorsFromDi, HttpHeaders } from '@angular/common/http';
import { NgModule, inject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
    ApolloLink,
    InMemoryCache,
} from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
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

    return {
        connectToDevTools: !environment.production,
        assumeImmutableResults: true,
        cache,
        link: ApolloLink.from([authLink, errorLink, http]),
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
