#!/usr/bin/env bash

set -o errexit

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TIMEOUT=10m0s
DB_CHARTS="$( cd ${CURRENT_DIR}/../charts/database && pwd )"

function checkInputParameterValue() {
    if [ -z "${1}" ] || [ "${1:0:2}" == "--" ]; then
        echo "Wrong parameter value"
        echo "Make sure parameter value is neither empty nor start with two hyphens"
        exit 1
    fi
}

POSITIONAL=()
while [[ $# -gt 0 ]]
do
    key="$1"

    case ${key} in
        --overrides-file)
            checkInputParameterValue "${2}"
            yq eval-all --inplace '. as $item ireduce ({}; . * $item )' mergedOverrides.yaml ${2}
            shift # past argument
            shift
        ;;
        --timeout)
            checkInputParameterValue "${2}"
            TIMEOUT="${2}"
            shift # past argument
            shift
        ;;
        --*)
            echo "Unknown flag ${1}"
            exit 1
        ;;
        *)    # unknown option
            POSITIONAL+=("$1") # save it in an array for later
            shift # past argument
        ;;
    esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

touch mergedOverrides.yaml # target file where all overrides .yaml files will be merged into. This is needed because if several override files with the same key/s are passed to helm, it applies the value/s from the last file for that key overriding everything else.
yq eval-all --inplace '. as $item ireduce ({}; . * $item )' mergedOverrides.yaml "${DB_CHARTS}"/values.yaml

# As of Kyma 2.6.3 we need to specify which namespaces should enable istio injection
RELEASE_NS=iot-system
kubectl create ns $RELEASE_NS --dry-run=client -o yaml | kubectl apply -f -
kubectl label ns $RELEASE_NS istio-injection=enabled --overwrite

# As of Kubernetes 1.25 we need to replace PodSecurityPolicies; we chose the Pod Security Standards
#"$KUBECTL" label ns $RELEASE_NS pod-security.kubernetes.io/enforce=baseline --overwrite

echo "Installing DB..."
helm upgrade --install --atomic --timeout "${TIMEOUT}" -f ./mergedOverrides.yaml --create-namespace --namespace "${RELEASE_NS}" database "${DB_CHARTS}"

trap "cleanup_trap" RETURN EXIT INT TERM

function cleanup_trap() {
#  if [[ -f mergedOverrides.yaml ]]; then
#    rm -f mergedOverrides.yaml
#  fi
}
