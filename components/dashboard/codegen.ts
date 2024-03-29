import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyAiYWxnIjogIm5vbmUiLCAidHlwIjogIkpXVCIgfQo.eyAic2NvcGVzIjogIndlYmhvb2s6d3JpdGUgZm9ybWF0aW9uX3RlbXBsYXRlLndlYmhvb2tzOnJlYWQgcnVudGltZS53ZWJob29rczpyZWFkIGFwcGxpY2F0aW9uLmxvY2FsX3RlbmFudF9pZDp3cml0ZSB0ZW5hbnRfc3Vic2NyaXB0aW9uOndyaXRlIHRlbmFudDp3cml0ZSBmZXRjaC1yZXF1ZXN0LmF1dGg6cmVhZCB3ZWJob29rcy5hdXRoOnJlYWQgYXBwbGljYXRpb24uYXV0aHM6cmVhZCBhcHBsaWNhdGlvbi53ZWJob29rczpyZWFkIGFwcGxpY2F0aW9uLmFwcGxpY2F0aW9uX3RlbXBsYXRlOnJlYWQgYXBwbGljYXRpb25fdGVtcGxhdGU6d3JpdGUgYXBwbGljYXRpb25fdGVtcGxhdGU6cmVhZCBhcHBsaWNhdGlvbl90ZW1wbGF0ZS53ZWJob29rczpyZWFkIGRvY3VtZW50LmZldGNoX3JlcXVlc3Q6cmVhZCBldmVudF9zcGVjLmZldGNoX3JlcXVlc3Q6cmVhZCBhcGlfc3BlYy5mZXRjaF9yZXF1ZXN0OnJlYWQgcnVudGltZS5hdXRoczpyZWFkIGludGVncmF0aW9uX3N5c3RlbS5hdXRoczpyZWFkIGJ1bmRsZS5pbnN0YW5jZV9hdXRoczpyZWFkIGJ1bmRsZS5pbnN0YW5jZV9hdXRoczpyZWFkIGFwcGxpY2F0aW9uOnJlYWQgYXV0b21hdGljX3NjZW5hcmlvX2Fzc2lnbm1lbnQ6cmVhZCBoZWFsdGhfY2hlY2tzOnJlYWQgYXBwbGljYXRpb246d3JpdGUgcnVudGltZTp3cml0ZSBsYWJlbF9kZWZpbml0aW9uOndyaXRlIGxhYmVsX2RlZmluaXRpb246cmVhZCBydW50aW1lOnJlYWQgdGVuYW50OnJlYWQgZm9ybWF0aW9uOnJlYWQgZm9ybWF0aW9uOndyaXRlIGludGVybmFsX3Zpc2liaWxpdHk6cmVhZCBmb3JtYXRpb25fdGVtcGxhdGU6cmVhZCBmb3JtYXRpb25fdGVtcGxhdGU6d3JpdGUgZm9ybWF0aW9uX2NvbnN0cmFpbnQ6cmVhZCBmb3JtYXRpb25fY29uc3RyYWludDp3cml0ZSBjZXJ0aWZpY2F0ZV9zdWJqZWN0X21hcHBpbmc6cmVhZCBjZXJ0aWZpY2F0ZV9zdWJqZWN0X21hcHBpbmc6d3JpdGUgZm9ybWF0aW9uLnN0YXRlOndyaXRlIHRlbmFudF9hY2Nlc3M6d3JpdGUiLCAidGVuYW50Ijoie1wiY29uc3VtZXJUZW5hbnRcIjpcIjNlNjRlYmFlLTM4YjUtNDZhMC1iMWVkLTljY2VlMTUzYTBhZVwiLFwiZXh0ZXJuYWxUZW5hbnRcIjpcIjNlNjRlYmFlLTM4YjUtNDZhMC1iMWVkLTljY2VlMTUzYTBhZVwifSIgfQo.',
                },
            },
        },
    ],
    documents: './src/app/shared/graphql/*.graphql',
    generates: {
        './src/app/shared/graphql/generated.ts': {
            plugins: [
                'typescript',
                'typescript-operations',
                'typescript-apollo-angular',
            ],
        },
    },
}
export default config
