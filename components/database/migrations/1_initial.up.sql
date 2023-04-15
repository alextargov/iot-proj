CREATE TYPE tenant_type AS ENUM (
    'USER',
    'ADMIN'
);

CREATE TYPE device_status AS ENUM (
    'INITIAL',
    'ACTIVE',
    'UNREACHABLE',
    'ERROR'
);


CREATE TABLE tenants (
    id uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    name varchar(256) NOT NULL,
    type tenant_type NOT NULL,
    created_at timestamp
);

CREATE TABLE devices (
    id uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    tenant_id uuid NOT NULL,
    CONSTRAINT tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(256) NOT NULL,
    description text,
    status device_status,
    auth jsonb,
    created_at timestamp,
    updated_at timestamp
);

CREATE TABLE hosts (
    id                uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    device_id         uuid             NOT NULL,
    CONSTRAINT device_id_fkey FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE,
    url               varchar(256)     NOT NULL,
    turn_on_endpoint  varchar(256),
    turn_off_endpoint varchar(256)
);