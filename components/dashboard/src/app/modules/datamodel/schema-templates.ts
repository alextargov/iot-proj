export interface SchemaTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    schema: object;
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
    {
        id: 'temperature-sensor',
        name: 'Temperature Sensor',
        description: 'Basic temperature and humidity sensor',
        icon: 'thermostat',
        schema: {
            type: 'object',
            properties: {
                temperature: {
                    type: 'number',
                    description: 'Temperature reading in Celsius',
                },
                humidity: {
                    type: 'number',
                    description: 'Relative humidity percentage',
                },
                timestamp: {
                    type: 'string',
                    description: 'ISO 8601 timestamp of the reading',
                },
            },
            required: ['temperature', 'timestamp'],
        },
    },
    {
        id: 'gps-tracker',
        name: 'GPS Tracker',
        description: 'Location tracking with GPS coordinates',
        icon: 'location_on',
        schema: {
            type: 'object',
            properties: {
                latitude: {
                    type: 'number',
                    description: 'GPS latitude coordinate',
                },
                longitude: {
                    type: 'number',
                    description: 'GPS longitude coordinate',
                },
                altitude: {
                    type: 'number',
                    description: 'Altitude in meters',
                },
                speed: {
                    type: 'number',
                    description: 'Speed in km/h',
                },
                heading: {
                    type: 'number',
                    description: 'Direction in degrees (0-360)',
                },
                timestamp: {
                    type: 'string',
                    description: 'ISO 8601 timestamp',
                },
            },
            required: ['latitude', 'longitude', 'timestamp'],
        },
    },
    {
        id: 'smart-meter',
        name: 'Smart Meter',
        description: 'Electrical energy monitoring',
        icon: 'electric_meter',
        schema: {
            type: 'object',
            properties: {
                voltage: {
                    type: 'number',
                    description: 'Voltage in volts',
                },
                current: {
                    type: 'number',
                    description: 'Current in amperes',
                },
                power: {
                    type: 'number',
                    description: 'Power in watts',
                },
                energy: {
                    type: 'number',
                    description: 'Cumulative energy in kWh',
                },
                powerFactor: {
                    type: 'number',
                    description: 'Power factor (0-1)',
                },
                timestamp: {
                    type: 'string',
                    description: 'ISO 8601 timestamp',
                },
            },
            required: ['voltage', 'current', 'power', 'timestamp'],
        },
    },
    {
        id: 'environment-monitor',
        name: 'Environment Monitor',
        description: 'Air quality and environmental conditions',
        icon: 'air',
        schema: {
            type: 'object',
            properties: {
                temperature: {
                    type: 'number',
                    description: 'Temperature in Celsius',
                },
                humidity: {
                    type: 'number',
                    description: 'Relative humidity percentage',
                },
                pressure: {
                    type: 'number',
                    description: 'Atmospheric pressure in hPa',
                },
                airQualityIndex: {
                    type: 'number',
                    description: 'Air Quality Index (0-500)',
                },
                co2: {
                    type: 'number',
                    description: 'CO2 concentration in ppm',
                },
                pm25: {
                    type: 'number',
                    description: 'PM2.5 particulate matter in µg/m³',
                },
                timestamp: {
                    type: 'string',
                    description: 'ISO 8601 timestamp',
                },
            },
            required: ['temperature', 'timestamp'],
        },
    },
    {
        id: 'motion-sensor',
        name: 'Motion Sensor',
        description: 'Motion detection and presence sensing',
        icon: 'sensors',
        schema: {
            type: 'object',
            properties: {
                detected: {
                    type: 'boolean',
                    description: 'Whether motion was detected',
                },
                sensitivity: {
                    type: 'number',
                    description: 'Sensor sensitivity level (0-100)',
                },
                zone: {
                    type: 'string',
                    description: 'Detection zone identifier',
                },
                occupancy: {
                    type: 'boolean',
                    description: 'Whether the area is occupied',
                },
                timestamp: {
                    type: 'string',
                    description: 'ISO 8601 timestamp',
                },
            },
            required: ['detected', 'timestamp'],
        },
    },
];
