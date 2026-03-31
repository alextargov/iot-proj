import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6ImFsZXgiLCJleHAiOjE3NzQ5OTA0MDEsImlhdCI6MTc3NDk3NjAwMSwiaXNzIjoib3JjaGVzdHJhdG9yIn0.wukaA2y5JvXVVuaT3M2RWz3Bm1oA4lz51Ac-1uUS6qY',
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
