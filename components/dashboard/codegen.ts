import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6ImFsZXgiLCJleHAiOjE3NzUxNjAxMzEsImlhdCI6MTc3NTE0NTczMSwiaXNzIjoib3JjaGVzdHJhdG9yIn0.IKFd9FPAuA_zDzZ2Nv8qd0vbrXwFPhpASCd6RyURpac',
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
};
export default config;
