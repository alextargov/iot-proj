import { Injectable } from '@angular/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable({
    providedIn: 'root',
})
export class JsonSchemaService {
    private readonly ajv: Ajv;

    constructor() {
        this.ajv = new Ajv({ allErrors: true, strict: true, verbose: true });
        addFormats(this.ajv);
    }

    /**
     * Validates a JSON Schema against the official meta-schema (e.g., draft-07)
     */
    async validateSchema(schema: string): Promise<{ valid: boolean; errors: any[] | null; }> {
        let schemaObj: object;
        try {
            schemaObj = JSON.parse(schema)
        } catch (e) {
            throw new Error(`Invalid JSON schema schema: ${e}`);
        }

        const valid: any = await this.ajv.validateSchema(schemaObj);
        return {
            valid,
            errors: valid ? null : this.ajv.errors || [],
        };
    }

    /**
     * Validates data against a schema (if schema is already valid)
     */
    validateData(schema: any, data: any): { valid: boolean; errors: any[] | null } {
        const validate = this.ajv.compile(schema);
        const valid = validate(data);
        return {
            valid: !!valid,
            errors: valid ? null : validate.errors || [],
        };
    }
}
