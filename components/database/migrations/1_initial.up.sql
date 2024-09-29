CREATE TYPE device_status AS ENUM (
    'INITIAL',
    'ACTIVE',
    'UNREACHABLE',
    'ERROR'
);

CREATE TYPE widget_status AS ENUM (
    'INACTIVE',
    'ACTIVE'
);


CREATE TABLE users (
    id uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    username varchar(256) NOT NULL,
    password varchar(256) NOT NULL,
    created_at timestamp,
    updated_at timestamp
);

CREATE TABLE devices (
    id uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    user_id uuid NOT NULL,
    CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE widgets (
    id uuid PRIMARY KEY NOT NULL CHECK (id <> '00000000-0000-0000-0000-000000000000'),
    user_id uuid NOT NULL,
    CONSTRAINT user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    name varchar(256) NOT NULL,
    description text,
    status widget_status,
    device_ids jsonb,
    created_at timestamp,
    updated_at timestamp
);
