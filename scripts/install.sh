CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

CHARTS="${CURRENT_DIR}/../charts/components"
RELEASE_NS=iot-system
TIMEOUT=5m0s
K3D_MEMORY=8192MB
K3D_TIMEOUT=10m0s

function cleanup_trap() {
  if [[ -f mergedOverrides.yaml ]]; then
    rm -f mergedOverrides.yaml
  fi
}

function installDatabase() {
  DB_OVERRIDES="${CURRENT_DIR}/resources/overrides-local.yaml"

  bash "${CURRENT_DIR}"/install-db.sh --overrides-file "${DB_OVERRIDES}" --timeout 30m0s

  STATUS=$(helm status database -n iot-system -o json | jq .info.status)
  echo "DB installation status ${STATUS}"
}

echo "Creating cluster..."

#k3d cluster create \
#--api-port '127.0.0.1:52982' \
#--k3s-arg "--disable=traefik@server:0"

k3d cluster create my-cluster \
  --api-port 6443 \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer"  \
  --k3s-arg "--disable=traefik@server:0"


echo "Installing Istio..."

#istioctl install --set profile=default -y
istioctl install --set profile=demo -y

kubectl create ns $RELEASE_NS --dry-run=client -o yaml | kubectl apply -f -
kubectl label ns $RELEASE_NS istio-injection=enabled --overwrite

touch mergedOverrides.yaml # target file where all overrides .yaml files will be merged into. This is needed because if several override files with the same key/s are passed to helm, it applies the value/s from the last file for that key overriding everything else.
yq eval-all --inplace '. as $item ireduce ({}; . * $item )' mergedOverrides.yaml "${CHARTS}"/values.yaml

installDatabase

echo "Starting installation..."
echo "Path to charts: " ${CHARTS}
#helm upgrade --install --atomic --timeout "${TIMEOUT}" -f ./mergedOverrides.yaml --create-namespace --namespace "${RELEASE_NS}" iot "${CHARTS}"
helm upgrade --install --atomic --timeout "${TIMEOUT}" -f ./mergedOverrides.yaml --create-namespace --namespace "${RELEASE_NS}" iot /Users/I540050/SAPDevelop/iot-automation/charts/components
#trap "cleanup_trap" RETURN EXIT INT TERM
echo "Installation finished successfully"

STATUS=$(helm status iot -n iot-system -o json | jq .info.status)
echo "Installation status ${STATUS}"

echo "Adding entries to /etc/hosts..."
echo "\n127.0.0.1 orchestrator.local.dev" | sudo tee -a /etc/hosts 1>/dev/null

echo "You can now access the GraphQL server on: http://orchestrator.local.dev/graphql"
