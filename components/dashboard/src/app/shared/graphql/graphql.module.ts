import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
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

const errorLink = onError(({ error, result }) => {
    // React on errors
    if (error) {
        console.error(`[Apollo Error]: ${error.message}`);
    }

    if (result?.errors && result.errors.length > 0) {
        console.error(`[GraphQL Error]: ${result.errors[0].message}`);
    }

    console.log('response', result);
});

const basicContext = (authToken: string) =>
    setContext((_, { headers }: any) => {
        const h = {
            ...headers,
            Accept: 'charset=utf-8',
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        };
        return {
            headers: h,
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

    const authToken = authService.getToken();
    console.log(authToken);

    return {
        connectToDevTools: !environment.production,
        assumeImmutableResults: true,
        cache,
        link: ApolloLink.from([basicContext(authToken), errorLink, http]),
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
