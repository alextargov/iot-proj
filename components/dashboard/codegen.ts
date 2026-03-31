import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6ImFsZXgiLCJleHAiOjE3NzQ5NDQwOTgsImlhdCI6MTc3NDkyOTY5OCwiaXNzIjoib3JjaGVzdHJhdG9yIn0.blJjK54rUFXOrga_aACXpqk4k5f1l4GPdk9v75mG4Bg',
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
