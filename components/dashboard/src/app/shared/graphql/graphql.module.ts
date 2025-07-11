import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import {
    ApolloClientOptions,
    ApolloLink,
    InMemoryCache,
} from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import {
    ApolloModule,
    APOLLO_NAMED_OPTIONS,
    APOLLO_OPTIONS,
} from 'apollo-angular'
import { HttpLink } from 'apollo-angular/http'
import { environment } from 'src/environments/environment'
import {AuthService} from "../services/auth/auth.service";

const errorLink = onError(({ graphQLErrors, networkError, response }) => {
    // React only on graphql errors
    if (graphQLErrors && graphQLErrors.length > 0) {
        if (
            (graphQLErrors[0] as any)?.statusCode >= 400 &&
            (graphQLErrors[0] as any)?.statusCode < 500
        ) {
            console.error(`[Client side error]: ${graphQLErrors[0].message}`)
        } else {
            console.error(`[Server side error]: ${graphQLErrors[0].message}`)
        }
    }
    if (networkError) {
        console.error(`[Network error]: ${networkError.message}`)
    }

    if (response.errors) {
        throw new Error("error")
    }

    console.log("response", response)
})

const basicContext = (authToken: string) => setContext((_, { headers }) => {
    const h = {
        ...headers,
        Accept: 'charset=utf-8',
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
    }
    return {
        headers: h,
    }
})
export function createDefaultApollo(
    httpLink: HttpLink,
    authService: AuthService,
): ApolloClientOptions<any> {
    const cache = new InMemoryCache({})

    // create http
    const http = httpLink.create({
        uri: 'http://localhost:8080/graphql',
        withCredentials: true,
    })

    const authToken = authService.getToken()
    console.log(authToken)

    return {
        connectToDevTools: !environment.production,
        assumeImmutableResults: true,
        cache,
        link: ApolloLink.from([basicContext(authToken), errorLink, http]),
        defaultOptions: {
            watchQuery: {
                errorPolicy: 'all',
            },
        },
    }
}

@NgModule({
    imports: [BrowserModule, HttpClientModule, ApolloModule],
    providers: [
        {
            provide: APOLLO_OPTIONS,
            useFactory: createDefaultApollo,
            deps: [HttpLink, AuthService],
        },
    ],
})
export class GraphQLModule {}
