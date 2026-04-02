-- Seed data for user alex
-- Password is 'pass' (bcrypt hashed)

-- =====================
-- Users
-- =====================
INSERT INTO users (id, username, password, created_at, updated_at) VALUES
('f7e39a3d-2229-49e0-86aa-b359730f45ec', 'alex', '$2a$10$wXOGXaMPaDwxxgjqIJjRhuxXGIIDjni1vVfeAx7aQWYakujmgkytG', now(), now());


BEGIN;
-- =====================
-- Data Models
-- =====================
INSERT INTO data_models (id, user_id, name, description, schema, created_at, updated_at) VALUES
('d1a2b3c4-d5e6-4789-abcd-ef0123456789', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Temperature Sensor', 'Schema for temperature sensors',
 '{"type": "object", "properties": {"temperature": {"type": "number", "unit": "celsius"}, "humidity": {"type": "number", "unit": "percent"}}}', now(), now()),
('d2b3c4d5-e6f7-4890-bcde-f01234567890', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Smart Light', 'Schema for smart light devices',
 '{"type": "object", "properties": {"state": {"type": "boolean"}, "brightness": {"type": "integer", "min": 0, "max": 100}}}', now(), now()),
('d3c4d5e6-f7a8-4901-cdef-012345678901', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Power Monitor', 'Schema for power consumption monitoring',
 '{"type": "object", "properties": {"power": {"type": "number", "unit": "W"}, "voltage": {"type": "number", "unit": "V"}, "current": {"type": "number", "unit": "A"}}}', now(), now()),
('d4d5e6f7-a8b9-4012-def0-123456789012', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Motion Sensor', 'Schema for motion detection sensors',
 '{"type": "object", "properties": {"motion_detected": {"type": "boolean"}, "last_motion_at": {"type": "string", "format": "date-time"}}}', now(), now()),
('d5e6f7a8-b9c0-4123-ef01-234567890123', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Door/Window Sensor', 'Schema for contact sensors',
 '{"type": "object", "properties": {"is_open": {"type": "boolean"}, "battery_level": {"type": "integer", "min": 0, "max": 100}}}', now(), now());

-- =====================
-- Devices
-- =====================
INSERT INTO devices (id, user_id, name, description, status, data_model_id, tags, auth, created_at, updated_at) VALUES
('1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Living Room Thermostat', 'Main living room temperature sensor', 'ACTIVE',
 'd1a2b3c4-d5e6-4789-abcd-ef0123456789', '["living-room", "temperature", "climate"]',
 '{"credential": {"basic": {"username": "sensor1", "password": "secret123"}}}', now(), now()),
('2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Bedroom Thermostat', 'Bedroom temperature and humidity sensor', 'ACTIVE',
 'd1a2b3c4-d5e6-4789-abcd-ef0123456789', '["bedroom", "temperature", "humidity"]',
 '{}', now(), now()),
('3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Kitchen Light', 'Smart LED light in kitchen', 'ACTIVE',
 'd2b3c4d5-e6f7-4890-bcde-f01234567890', '["kitchen", "light", "smart-home"]',
 '{}', now(), now()),
('4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Power Meter', 'Main power consumption monitor', 'ACTIVE',
 'd3c4d5e6-f7a8-4901-cdef-012345678901', '["power", "energy", "monitoring"]',
 '{}', now(), now()),
('5b698082-c396-4cc3-f3d0-4bed1693e6b3', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Garage Sensor', 'Temperature sensor in garage', 'UNREACHABLE',
 'd1a2b3c4-d5e6-4789-abcd-ef0123456789', '["garage", "temperature"]',
 '{}', now(), now()),
('6c7a9193-d4a7-4dd4-a4e1-5cfe27a4f7c4', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Bathroom Humidity Sensor', 'Monitors bathroom humidity levels', 'ACTIVE',
 'd1a2b3c4-d5e6-4789-abcd-ef0123456789', '["bathroom", "humidity", "ventilation"]',
 '{}', now(), now()),
('7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Outdoor Weather Station', 'External temperature and humidity', 'ACTIVE',
 'd1a2b3c4-d5e6-4789-abcd-ef0123456789', '["outdoor", "weather", "temperature"]',
 '{}', now(), now()),
('8e9cb3b5-f6c9-4ff6-c6a3-7eba49c6b9e6', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Office Light', 'Smart light in home office', 'ACTIVE',
 'd2b3c4d5-e6f7-4890-bcde-f01234567890', '["office", "light", "smart-home"]',
 '{}', now(), now()),
('9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Solar Panel Monitor', 'Solar energy production monitor', 'ACTIVE',
 'd3c4d5e6-f7a8-4901-cdef-012345678901', '["solar", "energy", "renewable"]',
 '{}', now(), now());

-- =====================
-- Hosts (Device endpoints)
-- =====================
INSERT INTO hosts (id, device_id, url, turn_on_endpoint, turn_off_endpoint) VALUES
('a1a2b3c4-d5e6-4789-abcd-ef0123456789', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'http://192.168.1.100:8080', '/api/on', '/api/off'),
('a2b3c4d5-e6f7-4890-bcde-f01234567890', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'http://192.168.1.101:8080', '/api/on', '/api/off'),
('a3c4d5e6-f7a8-4901-cdef-012345678901', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'http://192.168.1.102:8080', '/light/on', '/light/off'),
('a4d5e6f7-a8b9-4012-def0-123456789012', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'http://192.168.1.103:8080', NULL, NULL),
('a5e6f7a8-b9c0-4123-ef01-234567890123', '5b698082-c396-4cc3-f3d0-4bed1693e6b3', 'http://192.168.1.104:8080', '/api/on', '/api/off'),
('a6f7a8b9-c0d1-4234-f012-345678901234', '6c7a9193-d4a7-4dd4-a4e1-5cfe27a4f7c4', 'http://192.168.1.105:8080', NULL, NULL),
('a7a8b9c0-d1e2-4345-0123-456789012345', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'http://192.168.1.106:8080', NULL, NULL),
('a8b9c0d1-e2f3-4456-1234-567890123456', '8e9cb3b5-f6c9-4ff6-c6a3-7eba49c6b9e6', 'http://192.168.1.107:8080', '/light/on', '/light/off'),
('a9c0d1e2-f3a4-4567-2345-678901234567', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'http://192.168.1.108:8080', NULL, NULL);

-- =====================
-- Widgets (with schedules)
-- =====================
INSERT INTO widgets (id, user_id, name, description, status, schedule, last_executed_at, created_at, updated_at) VALUES
('b1a2b3c4-d5e6-4789-abcd-ef0123456789', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Temperature Alert', 'Send alert when living room temp exceeds 30C', 'ACTIVE',
 '*/5 * * * *', now() - interval '5 minutes', now(), now()),
('b2b3c4d5-e6f7-4890-bcde-f01234567890', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Daily Report', 'Generate daily temperature report', 'ACTIVE',
 '0 8 * * *', now() - interval '1 day', now(), now()),
('b3c4d5e6-f7a8-4901-cdef-012345678901', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Power Monitor', 'Track power consumption every hour', 'ACTIVE',
 '0 * * * *', now() - interval '1 hour', now(), now()),
('b4d5e6f7-a8b9-4012-def0-123456789012', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Light Controller', 'Manual light control widget', 'ACTIVE',
 NULL, NULL, now(), now()),
('b5e6f7a8-b9c0-4123-ef01-234567890123', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'Inactive Widget', 'Paused automation', 'INACTIVE',
 '*/15 * * * *', NULL, now(), now());

-- =====================
-- Widget Devices (many-to-many relationship)
-- =====================
INSERT INTO widget_devices (id, widget_id, device_id, created_at) VALUES
-- Temperature Alert -> Living Room Thermostat
('c1a2b3c4-d5e6-4789-abcd-ef0123456789', 'b1a2b3c4-d5e6-4789-abcd-ef0123456789', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', now()),
-- Daily Report -> Living Room Thermostat + Bedroom Thermostat
('c2b3c4d5-e6f7-4890-bcde-f01234567890', 'b2b3c4d5-e6f7-4890-bcde-f01234567890', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', now()),
('c2b3c4d5-e6f7-4890-bcde-f01234567891', 'b2b3c4d5-e6f7-4890-bcde-f01234567890', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', now()),
-- Power Monitor -> Power Meter
('c3c4d5e6-f7a8-4901-cdef-012345678901', 'b3c4d5e6-f7a8-4901-cdef-012345678901', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', now()),
-- Light Controller -> Kitchen Light
('c4d5e6f7-a8b9-4012-def0-123456789012', 'b4d5e6f7-a8b9-4012-def0-123456789012', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', now()),
-- Inactive Widget -> Living Room Thermostat
('c5e6f7a8-b9c0-4123-ef01-234567890123', 'b5e6f7a8-b9c0-4123-ef01-234567890123', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', now());

-- =====================
-- Device Metrics (sample historical data)
-- =====================
-- Living Room Thermostat - Temperature readings over the past 24 hours
INSERT INTO device_metrics (id, device_id, tenant_id, metric_name, metric_value, unit, recorded_at, created_at) VALUES
-- Today's readings (hourly)
('d0010001-0001-4001-a001-000000000001', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.5, 'celsius', now() - interval '23 hours', now()),
('d0010001-0001-4001-a001-000000000002', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.3, 'celsius', now() - interval '22 hours', now()),
('d0010001-0001-4001-a001-000000000003', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 21.8, 'celsius', now() - interval '21 hours', now()),
('d0010001-0001-4001-a001-000000000004', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 21.2, 'celsius', now() - interval '20 hours', now()),
('d0010001-0001-4001-a001-000000000005', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.8, 'celsius', now() - interval '19 hours', now()),
('d0010001-0001-4001-a001-000000000006', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.5, 'celsius', now() - interval '18 hours', now()),
('d0010001-0001-4001-a001-000000000007', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.2, 'celsius', now() - interval '17 hours', now()),
('d0010001-0001-4001-a001-000000000008', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.0, 'celsius', now() - interval '16 hours', now()),
('d0010001-0001-4001-a001-000000000009', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.5, 'celsius', now() - interval '15 hours', now()),
('d0010001-0001-4001-a001-000000000010', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 21.2, 'celsius', now() - interval '14 hours', now()),
('d0010001-0001-4001-a001-000000000011', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.0, 'celsius', now() - interval '13 hours', now()),
('d0010001-0001-4001-a001-000000000012', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 23.1, 'celsius', now() - interval '12 hours', now()),
('d0010001-0001-4001-a001-000000000013', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 24.2, 'celsius', now() - interval '11 hours', now()),
('d0010001-0001-4001-a001-000000000014', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 25.0, 'celsius', now() - interval '10 hours', now()),
('d0010001-0001-4001-a001-000000000015', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 25.5, 'celsius', now() - interval '9 hours', now()),
('d0010001-0001-4001-a001-000000000016', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 25.8, 'celsius', now() - interval '8 hours', now()),
('d0010001-0001-4001-a001-000000000017', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 26.0, 'celsius', now() - interval '7 hours', now()),
('d0010001-0001-4001-a001-000000000018', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 25.5, 'celsius', now() - interval '6 hours', now()),
('d0010001-0001-4001-a001-000000000019', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 24.8, 'celsius', now() - interval '5 hours', now()),
('d0010001-0001-4001-a001-000000000020', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 24.0, 'celsius', now() - interval '4 hours', now()),
('d0010001-0001-4001-a001-000000000021', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 23.5, 'celsius', now() - interval '3 hours', now()),
('d0010001-0001-4001-a001-000000000022', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 23.0, 'celsius', now() - interval '2 hours', now()),
('d0010001-0001-4001-a001-000000000023', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.8, 'celsius', now() - interval '1 hour', now()),
('d0010001-0001-4001-a001-000000000024', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.5, 'celsius', now(), now()),

-- Living Room Thermostat - Humidity readings
('d0020001-0001-4001-a001-000000000001', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 45.0, 'percent', now() - interval '23 hours', now()),
('d0020001-0001-4001-a001-000000000002', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 46.2, 'percent', now() - interval '20 hours', now()),
('d0020001-0001-4001-a001-000000000003', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 48.5, 'percent', now() - interval '17 hours', now()),
('d0020001-0001-4001-a001-000000000004', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 50.0, 'percent', now() - interval '14 hours', now()),
('d0020001-0001-4001-a001-000000000005', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 52.3, 'percent', now() - interval '11 hours', now()),
('d0020001-0001-4001-a001-000000000006', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 48.0, 'percent', now() - interval '8 hours', now()),
('d0020001-0001-4001-a001-000000000007', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 44.5, 'percent', now() - interval '5 hours', now()),
('d0020001-0001-4001-a001-000000000008', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 43.0, 'percent', now() - interval '2 hours', now()),
('d0020001-0001-4001-a001-000000000009', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 44.0, 'percent', now(), now()),

-- Bedroom Thermostat - Temperature readings
('d0030001-0001-4001-a001-000000000001', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 21.0, 'celsius', now() - interval '23 hours', now()),
('d0030001-0001-4001-a001-000000000002', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.5, 'celsius', now() - interval '20 hours', now()),
('d0030001-0001-4001-a001-000000000003', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 19.8, 'celsius', now() - interval '17 hours', now()),
('d0030001-0001-4001-a001-000000000004', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 19.0, 'celsius', now() - interval '14 hours', now()),
('d0030001-0001-4001-a001-000000000005', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 20.5, 'celsius', now() - interval '11 hours', now()),
('d0030001-0001-4001-a001-000000000006', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.0, 'celsius', now() - interval '8 hours', now()),
('d0030001-0001-4001-a001-000000000007', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 23.0, 'celsius', now() - interval '5 hours', now()),
('d0030001-0001-4001-a001-000000000008', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 22.0, 'celsius', now() - interval '2 hours', now()),
('d0030001-0001-4001-a001-000000000009', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 21.5, 'celsius', now(), now()),

-- Power Meter - Power consumption readings
('d0040001-0001-4001-a001-000000000001', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 1200.5, 'W', now() - interval '23 hours', now()),
('d0040001-0001-4001-a001-000000000002', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 850.0, 'W', now() - interval '20 hours', now()),
('d0040001-0001-4001-a001-000000000003', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 450.2, 'W', now() - interval '17 hours', now()),
('d0040001-0001-4001-a001-000000000004', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 320.0, 'W', now() - interval '14 hours', now()),
('d0040001-0001-4001-a001-000000000005', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 550.8, 'W', now() - interval '11 hours', now()),
('d0040001-0001-4001-a001-000000000006', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 980.0, 'W', now() - interval '8 hours', now()),
('d0040001-0001-4001-a001-000000000007', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 1450.5, 'W', now() - interval '5 hours', now()),
('d0040001-0001-4001-a001-000000000008', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 1680.0, 'W', now() - interval '2 hours', now()),
('d0040001-0001-4001-a001-000000000009', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 1520.3, 'W', now(), now()),

-- Power Meter - Voltage readings
('d0050001-0001-4001-a001-000000000001', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 230.5, 'V', now() - interval '23 hours', now()),
('d0050001-0001-4001-a001-000000000002', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 229.8, 'V', now() - interval '17 hours', now()),
('d0050001-0001-4001-a001-000000000003', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 231.2, 'V', now() - interval '11 hours', now()),
('d0050001-0001-4001-a001-000000000004', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 230.0, 'V', now() - interval '5 hours', now()),
('d0050001-0001-4001-a001-000000000005', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 230.8, 'V', now(), now()),

-- Kitchen Light - Brightness readings
('d0060001-0001-4001-a001-000000000001', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 0, 'percent', now() - interval '23 hours', now()),
('d0060001-0001-4001-a001-000000000002', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 0, 'percent', now() - interval '20 hours', now()),
('d0060001-0001-4001-a001-000000000003', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 0, 'percent', now() - interval '17 hours', now()),
('d0060001-0001-4001-a001-000000000004', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 75, 'percent', now() - interval '14 hours', now()),
('d0060001-0001-4001-a001-000000000005', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 100, 'percent', now() - interval '11 hours', now()),
('d0060001-0001-4001-a001-000000000006', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 50, 'percent', now() - interval '8 hours', now()),
('d0060001-0001-4001-a001-000000000007', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 100, 'percent', now() - interval '5 hours', now()),
('d0060001-0001-4001-a001-000000000008', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 25, 'percent', now() - interval '2 hours', now()),
('d0060001-0001-4001-a001-000000000009', '3f476e60-a174-4aa1-d1be-2acb9471c4f1', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'brightness', 0, 'percent', now(), now()),

-- Bathroom humidity readings
('d0070001-0001-4001-a001-000000000001', '6c7a9193-d4a7-4dd4-a4e1-5cfe27a4f7c4', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 65.0, 'percent', now() - interval '12 hours', now()),
('d0070001-0001-4001-a001-000000000002', '6c7a9193-d4a7-4dd4-a4e1-5cfe27a4f7c4', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 85.0, 'percent', now() - interval '8 hours', now()),
('d0070001-0001-4001-a001-000000000003', '6c7a9193-d4a7-4dd4-a4e1-5cfe27a4f7c4', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 72.0, 'percent', now() - interval '4 hours', now()),
('d0070001-0001-4001-a001-000000000004', '6c7a9193-d4a7-4dd4-a4e1-5cfe27a4f7c4', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 58.0, 'percent', now(), now()),

-- Outdoor weather station
('d0080001-0001-4001-a001-000000000001', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 12.5, 'celsius', now() - interval '12 hours', now()),
('d0080001-0001-4001-a001-000000000002', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 8.2, 'celsius', now() - interval '8 hours', now()),
('d0080001-0001-4001-a001-000000000003', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 15.8, 'celsius', now() - interval '4 hours', now()),
('d0080001-0001-4001-a001-000000000004', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'temperature', 18.2, 'celsius', now(), now()),
('d0080001-0001-4001-a001-000000000005', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 78.0, 'percent', now() - interval '12 hours', now()),
('d0080001-0001-4001-a001-000000000006', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 82.0, 'percent', now() - interval '8 hours', now()),
('d0080001-0001-4001-a001-000000000007', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 65.0, 'percent', now() - interval '4 hours', now()),
('d0080001-0001-4001-a001-000000000008', '7d8ba2a4-e5b8-4ee5-b5f2-6daf38b5a8d5', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'humidity', 55.0, 'percent', now(), now()),

-- Solar panel production
('d0090001-0001-4001-a001-000000000001', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 0.0, 'W', now() - interval '12 hours', now()),
('d0090001-0001-4001-a001-000000000002', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 850.0, 'W', now() - interval '8 hours', now()),
('d0090001-0001-4001-a001-000000000003', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 2200.0, 'W', now() - interval '4 hours', now()),
('d0090001-0001-4001-a001-000000000004', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'power', 1800.0, 'W', now(), now()),
('d0090001-0001-4001-a001-000000000005', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 48.2, 'V', now() - interval '8 hours', now()),
('d0090001-0001-4001-a001-000000000006', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 52.1, 'V', now() - interval '4 hours', now()),
('d0090001-0001-4001-a001-000000000007', '9f0dc4c6-a7da-4007-d7b4-8fcb50d7c0f7', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', 'voltage', 50.8, 'V', now(), now());

-- =====================
-- Alert Rules
-- =====================
INSERT INTO alert_rules (id, tenant_id, device_id, name, description, severity, enabled, cooldown_minutes, last_triggered_at, created_at, updated_at) VALUES
-- High temperature alert for Living Room
('e1a2b3c4-d5e6-4789-abcd-ef0123456789', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '1d254c4e-8f52-4889-b9fc-0ea97259a2df',
 'High Temperature Alert', 'Triggered when living room temperature exceeds 28C', 'WARNING', true, 30,
 now() - interval '2 hours', now(), now()),

-- Critical temperature alert for Living Room
('e2b3c4d5-e6f7-4890-bcde-f01234567890', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '1d254c4e-8f52-4889-b9fc-0ea97259a2df',
 'Critical Temperature Alert', 'Triggered when temperature exceeds 35C - potential HVAC failure', 'CRITICAL', true, 15,
 NULL, now(), now()),

-- Low temperature alert for Bedroom
('e3c4d5e6-f7a8-4901-cdef-012345678901', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '2e365d5f-9063-4990-c0ad-1fba8360b3e0',
 'Low Temperature Alert', 'Bedroom temperature dropped below 16C', 'WARNING', true, 60,
 now() - interval '1 day', now(), now()),

-- High humidity alert
('e4d5e6f7-a8b9-4012-def0-123456789012', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '1d254c4e-8f52-4889-b9fc-0ea97259a2df',
 'High Humidity Alert', 'Humidity exceeds 70% - mold risk', 'WARNING', true, 120,
 NULL, now(), now()),

-- Power consumption spike alert
('e5e6f7a8-b9c0-4123-ef01-234567890123', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2',
 'Power Spike Alert', 'Power consumption exceeded 2000W', 'CRITICAL', true, 15,
 now() - interval '6 hours', now(), now()),

-- Voltage fluctuation alert
('e6f7a8b9-c0d1-4234-f012-345678901234', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2',
 'Voltage Fluctuation Alert', 'Voltage outside normal range (220V-240V)', 'WARNING', true, 30,
 NULL, now(), now()),

-- Disabled alert example
('e7a8b9c0-d1e2-4345-0123-456789012345', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '3f476e60-a174-4aa1-d1be-2acb9471c4f1',
 'Light Always On Alert', 'Light has been on for more than 8 hours', 'INFO', false, 480,
 NULL, now(), now()),

-- Garage offline alert
('e8b9c0d1-e2f3-4456-1234-567890123456', 'f7e39a3d-2229-49e0-86aa-b359730f45ec', '5b698082-c396-4cc3-f3d0-4bed1693e6b3',
 'Garage Sensor Offline', 'Garage sensor has not reported data', 'CRITICAL', true, 60,
 now() - interval '3 hours', now(), now());

-- =====================
-- Alert Conditions
-- =====================
INSERT INTO alert_conditions (id, alert_rule_id, group_id, metric_name, operator, threshold, created_at) VALUES
-- High Temperature Alert: temperature > 28
('f1a2b3c4-d5e6-4789-abcd-ef0123456789', 'e1a2b3c4-d5e6-4789-abcd-ef0123456789', 0, 'temperature', 'GT', 28.0, now()),

-- Critical Temperature Alert: temperature > 35
('f2b3c4d5-e6f7-4890-bcde-f01234567890', 'e2b3c4d5-e6f7-4890-bcde-f01234567890', 0, 'temperature', 'GT', 35.0, now()),

-- Low Temperature Alert: temperature < 16
('f3c4d5e6-f7a8-4901-cdef-012345678901', 'e3c4d5e6-f7a8-4901-cdef-012345678901', 0, 'temperature', 'LT', 16.0, now()),

-- High Humidity Alert: humidity > 70
('f4d5e6f7-a8b9-4012-def0-123456789012', 'e4d5e6f7-a8b9-4012-def0-123456789012', 0, 'humidity', 'GT', 70.0, now()),

-- Power Spike Alert: power > 2000
('f5e6f7a8-b9c0-4123-ef01-234567890123', 'e5e6f7a8-b9c0-4123-ef01-234567890123', 0, 'power', 'GT', 2000.0, now()),

-- Voltage Fluctuation Alert: voltage < 220 OR voltage > 240 (two groups, ORed together)
('f6f7a8b9-c0d1-4234-f012-345678901234', 'e6f7a8b9-c0d1-4234-f012-345678901234', 0, 'voltage', 'LT', 220.0, now()),
('f7a8b9c0-d1e2-4345-0123-456789012345', 'e6f7a8b9-c0d1-4234-f012-345678901234', 1, 'voltage', 'GT', 240.0, now()),

-- Light Always On Alert: brightness >= 1 (any non-zero value)
('f8b9c0d1-e2f3-4456-1234-567890123456', 'e7a8b9c0-d1e2-4345-0123-456789012345', 0, 'brightness', 'GTE', 1.0, now()),

-- Garage Sensor Offline: temperature = -999 (sentinel value for offline)
('f9c0d1e2-f3a4-4567-2345-678901234567', 'e8b9c0d1-e2f3-4456-1234-567890123456', 0, 'temperature', 'EQ', -999.0, now());

-- =====================
-- Alert Notifications
-- =====================
INSERT INTO alert_notifications (id, alert_rule_id, type, config, created_at) VALUES
-- Email notifications
('01a2b3c4-d5e6-4789-abcd-ef0123456789', 'e1a2b3c4-d5e6-4789-abcd-ef0123456789', 'email',
 '{"recipients": ["alex@example.com"], "subject": "High Temperature Warning"}', now()),
('02b3c4d5-e6f7-4890-bcde-f01234567890', 'e2b3c4d5-e6f7-4890-bcde-f01234567890', 'email',
 '{"recipients": ["alex@example.com", "maintenance@example.com"], "subject": "CRITICAL: Temperature Alert"}', now()),
('03c4d5e6-f7a8-4901-cdef-012345678901', 'e5e6f7a8-b9c0-4123-ef01-234567890123', 'email',
 '{"recipients": ["alex@example.com"], "subject": "Power Consumption Alert"}', now()),

-- Webhook notifications
('04d5e6f7-a8b9-4012-def0-123456789012', 'e2b3c4d5-e6f7-4890-bcde-f01234567890', 'webhook',
 '{"url": "https://hooks.slack.com/services/xxx/yyy/zzz", "method": "POST"}', now()),
('05e6f7a8-b9c0-4123-ef01-234567890123', 'e8b9c0d1-e2f3-4456-1234-567890123456', 'webhook',
 '{"url": "https://api.pagerduty.com/incidents", "method": "POST", "headers": {"Authorization": "Token xxx"}}', now()),

-- SMS notifications for critical alerts
('06f7a8b9-c0d1-4234-f012-345678901234', 'e2b3c4d5-e6f7-4890-bcde-f01234567890', 'sms',
 '{"phone": "+1234567890"}', now()),
('07a8b9c0-d1e2-4345-0123-456789012345', 'e5e6f7a8-b9c0-4123-ef01-234567890123', 'sms',
 '{"phone": "+1234567890"}', now());

-- =====================
-- Alert Events (Historical triggered alerts)
-- =====================
INSERT INTO alert_events (id, alert_rule_id, device_id, tenant_id, triggered_values, status, triggered_at, resolved_at, created_at) VALUES
-- High temperature events
('11a2b3c4-d5e6-4789-abcd-ef0123456789', 'e1a2b3c4-d5e6-4789-abcd-ef0123456789', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"temperature": 29.5}', 'RESOLVED', now() - interval '3 days', now() - interval '3 days' + interval '45 minutes', now()),
('12b3c4d5-e6f7-4890-bcde-f01234567890', 'e1a2b3c4-d5e6-4789-abcd-ef0123456789', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"temperature": 30.2}', 'RESOLVED', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', now()),
('13c4d5e6-f7a8-4901-cdef-012345678901', 'e1a2b3c4-d5e6-4789-abcd-ef0123456789', '1d254c4e-8f52-4889-b9fc-0ea97259a2df', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"temperature": 28.8}', 'ACKNOWLEDGED', now() - interval '2 hours', NULL, now()),

-- Low temperature event in bedroom
('14d5e6f7-a8b9-4012-def0-123456789012', 'e3c4d5e6-f7a8-4901-cdef-012345678901', '2e365d5f-9063-4990-c0ad-1fba8360b3e0', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"temperature": 14.5}', 'RESOLVED', now() - interval '1 day', now() - interval '1 day' + interval '2 hours', now()),

-- Power spike events
('15e6f7a8-b9c0-4123-ef01-234567890123', 'e5e6f7a8-b9c0-4123-ef01-234567890123', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"power": 2350.5}', 'RESOLVED', now() - interval '1 day', now() - interval '1 day' + interval '15 minutes', now()),
('16f7a8b9-c0d1-4234-f012-345678901234', 'e5e6f7a8-b9c0-4123-ef01-234567890123', '4a587f71-b285-4bb2-e2cf-3adc0582d5a2', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"power": 2180.0}', 'RESOLVED', now() - interval '6 hours', now() - interval '6 hours' + interval '30 minutes', now()),

-- Garage sensor offline event (still active)
('17a8b9c0-d1e2-4345-0123-456789012345', 'e8b9c0d1-e2f3-4456-1234-567890123456', '5b698082-c396-4cc3-f3d0-4bed1693e6b3', 'f7e39a3d-2229-49e0-86aa-b359730f45ec',
 '{"temperature": -999}', 'TRIGGERED', now() - interval '3 hours', NULL, now());

COMMIT;