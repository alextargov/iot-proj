INSERT INTO public.tenants (id, name, type, created_at) VALUES
('3e64ebae-38b5-46a0-b1ed-9ccee153a0ae', 'default', 'ADMIN', now()),
('1eba80dd-8ff6-54ee-be4d-77944d17b10b', 'foo', 'USER', now()),
('af9f84a9-1d3a-4d9f-ae0c-94f883b33b6e', 'bar', 'USER', now());

INSERT INTO public.devices (id, tenant_id, name, description, status, auth, created_at) VALUES
('3d254c4e-8f52-4889-b9fc-0ea97259a2df', '3e64ebae-38b5-46a0-b1ed-9ccee153a0ae', 'Temperature Sensor', 'Living room temp', 'ACTIVE', '{ "credential": {"basic": {"username": "user", "password": "pass"}}}', now()),
('12254c4e-1f52-1889-b9fc-11197259a2df', '3e64ebae-38b5-46a0-b1ed-9ccee153a0ae', 'Temperature Sensor', 'Bedroom room temp', 'UNREACHABLE', '{}', now()),
('13354c4e-2f52-2889-b9fc-22297259a2df', '1eba80dd-8ff6-54ee-be4d-77944d17b10b', 'Temperature Sensor', 'Bedroom room temp', 'ACTIVE', '{}', now());

INSERT INTO hosts (id, device_id, url, turn_on_endpoint, turn_off_endpoint) VALUES
('fc3ad0a9-0183-48b6-8840-2f3b63573040', '3d254c4e-8f52-4889-b9fc-0ea97259a2df', 'http://localhost:8080', '/turnOn', '/turnOff');