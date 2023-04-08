#!/usr/bin/env bash

# This script is responsible for running Director with PostgreSQL.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
INVERTED='\033[7m'
NC='\033[0m' # No Color

set -e

ROOT_PATH=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
DATABASE_COMPONENT_PATH=${ROOT_PATH}/../../database

SKIP_DB_CLEANUP=false
REUSE_DB=false
AUTO_TERMINATE=false
DISABLE_ASYNC_MODE=true
COMPONENT='orchestrator'
TERMINAION_TIMEOUT_IN_SECONDS=300

POSITIONAL=()
while [[ $# -gt 0 ]]
do

    key="$1"

    case ${key} in
        --skip-db-cleanup)
            SKIP_DB_CLEANUP=true
            shift
        ;;
        --reuse-db)
            REUSE_DB=true
            shift
        ;;
        --debug)
            DEBUG=true
            DEBUG_PORT=40000
            shift
        ;;
        --jwks-endpoint)
          export APP_JWKS_ENDPOINT=$2
          shift
          shift
        ;;
        --debug-port)
            DEBUG_PORT=$2
            shift
            shift
        ;;
        --auto-terminate)
             AUTO_TERMINATE=true
             TERMINAION_TIMEOUT_IN_SECONDS=$2
             shift
             shift
         ;;
        --*)
            echo "Unknown flag ${1}"
            exit 1
        ;;
    esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

POSTGRES_CONTAINER="test-postgres"
# Using v12 because the DB Dump file headers are not compatible with Postgres v11.
POSTGRES_VERSION="12"

DB_USER="postgres"
DB_PWD="pgsql@12345"
DB_NAME="postgres"
DB_PORT="5432"
DB_HOST="127.0.0.1"

function cleanup() {

    if [[ ${DEBUG} == true ]]; then
       echo -e "${GREEN}Cleanup binary${NC}"
       rm  $GOPATH/src/github.com/iot-proj/components/orchestrator/main || true
    fi

    if [[ ${SKIP_DB_CLEANUP} = false ]]; then
        echo -e "${GREEN}Cleanup Postgres container${NC}"
        docker rm --force ${POSTGRES_CONTAINER}
    else
        echo -e "${GREEN}Skipping Postgres container cleanup${NC}"
    fi

    echo -e "${GREEN}Destroying k3d cluster...${NC}"
    k3d cluster delete k3d-cluster
}

trap cleanup EXIT

echo -e "${GREEN}Creating k3d cluster...${NC}"
curl -s https://raw.githubusercontent.com/rancher/k3d/main/install.sh | TAG=v5.2.2 bash
k3d cluster create k3d-cluster --api-port 6550 --servers 1 --port 443:443@loadbalancer --image rancher/k3s:v1.22.4-k3s1 --kubeconfig-update-default --wait

if [[ ${REUSE_DB} = true ]]; then
    echo -e "${GREEN}Will reuse existing Postgres container${NC}"
else
    set +e
    echo -e "${GREEN}Start Postgres in detached mode${NC}"
    docker run -d --name ${POSTGRES_CONTAINER} \
                -e POSTGRES_HOST=${DB_HOST} \
                -e POSTGRES_USER=${DB_USER} \
                -e POSTGRES_PASSWORD=${DB_PWD} \
                -e POSTGRES_DB=${DB_NAME} \
                -e POSTGRES_PORT=${DB_PORT} \
                -p ${DB_PORT}:${DB_PORT} \
                -v ${ROOT_PATH}/../../database/seeds:/tmp \
                postgres:${POSTGRES_VERSION}

    if [[ $? -ne 0 ]] ; then
        SKIP_DB_CLEANUP=true
        exit 1
    fi

    echo '# WAITING FOR CONNECTION WITH DATABASE #'
    for i in {1..30}
    do
        docker exec ${POSTGRES_CONTAINER} pg_isready -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}"
        if [ $? -eq 0 ]
        then
            dbReady=true
            break
        fi
        sleep 1
    done

    if [ "${dbReady}" != true ] ; then
        echo '# COULD NOT ESTABLISH CONNECTION TO DATABASE #'
        exit 1
    fi

    set -e

    echo -e "${GREEN}Populate DB${NC}"

    CONNECTION_STRING="postgres://$DB_USER:$DB_PWD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"
    migrate -path ${ROOT_PATH}/../../database/migrations -database "$CONNECTION_STRING" up

    echo -e "SUCCESS"
    cat ${ROOT_PATH}/../../database/seeds/*.sql | \
    docker exec -i ${POSTGRES_CONTAINER} psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -d "${DB_NAME}"
fi

echo "Migration version: $(migrate -path ${ROOT_PATH}/../../database/migrations -database "$CONNECTION_STRING" version 2>&1)"
. ${ROOT_PATH}/jwt_generator.sh

if [[  ${SKIP_APP_START} ]]; then
    echo -e "${GREEN}Skipping starting application${NC}"
    while true
    do
        sleep 1
    done
fi

echo -e "${GREEN}Starting application${NC}"

export APP_DB_USER=${DB_USER}
export APP_DB_PASSWORD=${DB_PWD}
export APP_DB_NAME=${DB_NAME}
export APP_CONFIGURATION_FILE=${ROOT_PATH}/config-local.yaml
export APP_LOG_LEVEL=debug
export APP_ALLOW_JWT_SIGNING_NONE=true


if [[  ${DEBUG} == true ]]; then
    echo -e "${GREEN}Debug mode activated on port $DEBUG_PORT${NC}"
    cd $GOPATH/src/github.com/iot-proj/components/orchestrator
    CGO_ENABLED=0 go build -gcflags="all=-N -l" ./cmd/${COMPONENT}
    dlv --listen=:$DEBUG_PORT --headless=true --api-version=2 exec ./${COMPONENT}
else
    if [[  ${AUTO_TERMINATE} == true ]]; then
        cd ${ROOT_PATH}
        go build ${ROOT_PATH}/../cmd/${COMPONENT}/main.go
        MAIN_APP_LOGFILE=${ROOT_PATH}/../main.log

        ${ROOT_PATH}/../main > ${MAIN_APP_LOGFILE} &
        MAIN_PROCESS_PID="$!"/cmd

        START_TIME=$(date +%s)
        SECONDS=0
        while (( SECONDS < ${TERMINAION_TIMEOUT_IN_SECONDS} )) ; do
            CURRENT_TIME=$(date +%s)
            SECONDS=$((CURRENT_TIME-START_TIME))
            SECONDS_LEFT=$((TERMINAION_TIMEOUT_IN_SECONDS-SECONDS))
            echo "[Director] left ${SECONDS_LEFT} seconds. Wait ..."
            sleep 10
        done

        echo "Timeout of ${TERMINAION_TIMEOUT_IN_SECONDS} seconds for starting director reached. Killing the process."
        echo -e "${GREEN}Kill main process..${NC}"
        kill -SIGINT "${MAIN_PROCESS_PID}"
        echo -e "${GREEN}Delete build result ...${NC}"
        rm ${ROOT_PATH}/../main || true
        wait
    else
        go run ${ROOT_PATH}/../cmd/${COMPONENT}/main.go
    fi
fi
