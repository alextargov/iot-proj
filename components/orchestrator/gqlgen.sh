#!/bin/sh

echo "Generating code from GraphQL schema..."

COMPONENT_DIR="$( cd "$(dirname "$0")" ; pwd -P )"


cd "$(dirname "$0")"

cd ${COMPONENT_DIR}/pkg/graphql
go run github.com/99designs/gqlgen --verbose --config ./gqlgen.yml
