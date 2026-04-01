import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: [
        {
            'http://127.0.0.1:8080/graphql': {
                headers: {
                    Authorization:
                        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6ImFsZXgiLCJleHAiOjE3NzUwNzMyNzgsImlhdCI6MTc3NTA1ODg3OCwiaXNzIjoib3JjaGVzdHJhdG9yIn0._kTwmsPKNI0jDpMDk8v0_Pz6Fk_QmXo5Hbq-IlTU_G4',
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
