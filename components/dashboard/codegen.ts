import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6ImFsZXgxIiwiZXhwIjoxNzUyNDQ3ODcyLCJpYXQiOjE3NTI0MzM0NzIsImlzcyI6Im9yY2hlc3RyYXRvciJ9.NXX0xq0vOm6hDfcW7f53kT9CZP3g03-3MamJUlaWE6M',
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
