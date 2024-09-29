INSERT INTO users (id, username, password, created_at, updated_at) VALUES
('3286fa91-20c0-4596-b863-cc6a93ce7acb', 'alex', '$2a$10$hSlW4g.qwR28qNj3qCvWXuud04K6utKtdWxtxwnA1qtBPt5qU40m6', now(), now());

INSERT INTO devices (id, user_id, name, description, status, auth, created_at) VALUES
('3d254c4e-8f52-4889-b9fc-0ea97259a2df', '3286fa91-20c0-4596-b863-cc6a93ce7acb', 'Temperature Sensor', 'Living room temp', 'ACTIVE', '{ "credential": {"basic": {"username": "user", "password": "pass"}}}', now()),
('a29d407c-52d6-47f4-b508-b8f36d64faa2', '3286fa91-20c0-4596-b863-cc6a93ce7acb', 'Temperature Sensor', 'Bedroom room temp', 'UNREACHABLE', '{}', now()),
('921d3610-ce7e-4926-aba8-c1d6ebc5c60e', '3286fa91-20c0-4596-b863-cc6a93ce7acb', 'Temperature Sensor', 'Bedroom room temp', 'ACTIVE', '{}', now());

INSERT INTO hosts (id, device_id, url, turn_on_endpoint, turn_off_endpoint) VALUES
('fc3ad0a9-0183-48b6-8840-2f3b63573040', '3d254c4e-8f52-4889-b9fc-0ea97259a2df', 'http://localhost:8080', '/turnOn', '/turnOff');