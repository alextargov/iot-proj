import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6ImFsZXgiLCJleHAiOjE3NzQ4Njk4MDksImlhdCI6MTc3NDg1NTQwOSwiaXNzIjoib3JjaGVzdHJhdG9yIn0.IuDfM6LxasbCKXIPBKPD33anb_TkWBX7J3YnZ5ac19w',
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
