FROM --platform=$BUILDPLATFORM golang:1.21.6-alpine3.19 as builder

WORKDIR /

#
# Download dependencies
#

COPY go.mod go.mod
COPY go.sum go.sum
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download -x

#
# Copy files
#

COPY . .

#
# Build app
#

ARG TARGETOS TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -v -o orchestrator ./cmd/orchestrator/main.go
RUN mkdir /app && mv ./orchestrator /app/orchestrator

FROM alpine:3.19
WORKDIR /app

#
# Copy binary
#

RUN apk --no-cache add curl ca-certificates

COPY --from=builder /app /app
#
# Run app
#

CMD ["/app/orchestrator"]
