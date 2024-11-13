# iot

## How to:
### Regenerate graphql schema in backend
1. Make changes to schema
2. Run: `gqlgen.sh`

### Regenerate graphql schema in UI
1. Make sure that the schema in the backend is up-to-date
2. Run the `orchestrator` component
3. Run: `npm run generate-types`

### Run in Docker
1. Start Docker
2. Run: `./scripts/install.sh`
3. Access from `http://localhost:8080`
