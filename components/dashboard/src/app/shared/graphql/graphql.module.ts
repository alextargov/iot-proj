import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { ApolloModule, APOLLO_NAMED_OPTIONS, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { environment } from 'src/environments/environment';

const errorLink = onError(({ graphQLErrors, networkError, response }) => {
	// React only on graphql errors
	if (graphQLErrors && graphQLErrors.length > 0) {
		if (
			(graphQLErrors[0] as any)?.statusCode >= 400 &&
			(graphQLErrors[0] as any)?.statusCode < 500
		) {
			console.error(`[Client side error]: ${graphQLErrors[0].message}`);
		} else {
			console.error(`[Server side error]: ${graphQLErrors[0].message}`);
		}
	}
	if (networkError) {
    console.error(`[Network error]: ${networkError.message}`);
	}
});

const basicContext = setContext((_, { headers }) => {
  const h = {
    ...headers,
    Accept: 'charset=utf-8',
    Authorization: 'Bearer eyAiYWxnIjogIm5vbmUiLCAidHlwIjogIkpXVCIgfQo.eyAic2NvcGVzIjogIndlYmhvb2s6d3JpdGUgZm9ybWF0aW9uX3RlbXBsYXRlLndlYmhvb2tzOnJlYWQgcnVudGltZS53ZWJob29rczpyZWFkIGFwcGxpY2F0aW9uLmxvY2FsX3RlbmFudF9pZDp3cml0ZSB0ZW5hbnRfc3Vic2NyaXB0aW9uOndyaXRlIHRlbmFudDp3cml0ZSBmZXRjaC1yZXF1ZXN0LmF1dGg6cmVhZCB3ZWJob29rcy5hdXRoOnJlYWQgYXBwbGljYXRpb24uYXV0aHM6cmVhZCBhcHBsaWNhdGlvbi53ZWJob29rczpyZWFkIGFwcGxpY2F0aW9uLmFwcGxpY2F0aW9uX3RlbXBsYXRlOnJlYWQgYXBwbGljYXRpb25fdGVtcGxhdGU6d3JpdGUgYXBwbGljYXRpb25fdGVtcGxhdGU6cmVhZCBhcHBsaWNhdGlvbl90ZW1wbGF0ZS53ZWJob29rczpyZWFkIGRvY3VtZW50LmZldGNoX3JlcXVlc3Q6cmVhZCBldmVudF9zcGVjLmZldGNoX3JlcXVlc3Q6cmVhZCBhcGlfc3BlYy5mZXRjaF9yZXF1ZXN0OnJlYWQgcnVudGltZS5hdXRoczpyZWFkIGludGVncmF0aW9uX3N5c3RlbS5hdXRoczpyZWFkIGJ1bmRsZS5pbnN0YW5jZV9hdXRoczpyZWFkIGJ1bmRsZS5pbnN0YW5jZV9hdXRoczpyZWFkIGFwcGxpY2F0aW9uOnJlYWQgYXV0b21hdGljX3NjZW5hcmlvX2Fzc2lnbm1lbnQ6cmVhZCBoZWFsdGhfY2hlY2tzOnJlYWQgYXBwbGljYXRpb246d3JpdGUgcnVudGltZTp3cml0ZSBsYWJlbF9kZWZpbml0aW9uOndyaXRlIGxhYmVsX2RlZmluaXRpb246cmVhZCBydW50aW1lOnJlYWQgdGVuYW50OnJlYWQgZm9ybWF0aW9uOnJlYWQgZm9ybWF0aW9uOndyaXRlIGludGVybmFsX3Zpc2liaWxpdHk6cmVhZCBmb3JtYXRpb25fdGVtcGxhdGU6cmVhZCBmb3JtYXRpb25fdGVtcGxhdGU6d3JpdGUgZm9ybWF0aW9uX2NvbnN0cmFpbnQ6cmVhZCBmb3JtYXRpb25fY29uc3RyYWludDp3cml0ZSBjZXJ0aWZpY2F0ZV9zdWJqZWN0X21hcHBpbmc6cmVhZCBjZXJ0aWZpY2F0ZV9zdWJqZWN0X21hcHBpbmc6d3JpdGUgZm9ybWF0aW9uLnN0YXRlOndyaXRlIHRlbmFudF9hY2Nlc3M6d3JpdGUiLCAidGVuYW50Ijoie1wiY29uc3VtZXJUZW5hbnRcIjpcIjNlNjRlYmFlLTM4YjUtNDZhMC1iMWVkLTljY2VlMTUzYTBhZVwiLFwiZXh0ZXJuYWxUZW5hbnRcIjpcIjNlNjRlYmFlLTM4YjUtNDZhMC1iMWVkLTljY2VlMTUzYTBhZVwifSIgfQo.',
    'Content-Type': 'application/json',
  }
  console.log(h)
	return {
		headers: h
	};
});
export function createDefaultApollo(httpLink: HttpLink): ApolloClientOptions<any> {
	const cache = new InMemoryCache({});

	// create http
	const http = httpLink.create({
		uri: 'http://localhost:8080/graphql',
    withCredentials: true,
	});

	return {
		connectToDevTools: !environment.production,
		assumeImmutableResults: true,
		cache,
		link: ApolloLink.from([basicContext, errorLink, http]),
		defaultOptions: {
			watchQuery: {
				errorPolicy: 'all',
			},
		},
	};
}

@NgModule({
	imports: [BrowserModule, HttpClientModule, ApolloModule],
	providers: [
		{
			provide: APOLLO_OPTIONS,
			useFactory: createDefaultApollo,
			deps: [HttpLink],
		},
	],
})
export class GraphQLModule {}
