FROM --platform=$BUILDPLATFORM golang:1.21.6-alpine3.19 as builder

WORKDIR /
RUN apk --update --no-cache add bash git

ARG VERSION="v4.16.2"
ARG DATABASE="postgres"
ARG SOURCE="file"

RUN git clone https://github.com/golang-migrate/migrate
WORKDIR /migrate
RUN git checkout $VERSION


ARG TARGETOS TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -a -o migrate -ldflags="-X main.Version=$VERSION" -tags "$DATABASE $SOURCE" ./cmd/migrate

FROM alpine:3.19

ARG TARGETARCH

# Set environment variables (can be overridden)
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=postgres

# Working directory
WORKDIR /migrate

RUN apk --update --no-cache add bash postgresql-client curl jq

COPY --from=builder /migrate /migrate
RUN chmod +x ./migrate

RUN mv migrate /usr/local/bin/migrate

# Copy migration files
COPY ./migrations /migrations

# Copy seed files
COPY ./seeds /seeds

# Copy migration script
COPY ./migrate.sh /migrate/migrate.sh

# Make script executable
RUN chmod +x /migrate/migrate.sh

# Run migration script as the default command
CMD ["/migrate/migrate.sh"]