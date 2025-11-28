interface AIGeneratedSchemaNode {
  type: string;
  description?: string;
  // This is the array format OpenAI generates
  properties_list?: Array<{
    key: string;
    value: AIGeneratedSchemaNode;
    required: boolean;
  }>;
  items?: AIGeneratedSchemaNode;
  enum_values?: string[];
}

interface StandardJSONSchema {
  type: string;
  description?: string;
  // This is the standard map format we want
  properties?: Record<string, StandardJSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: StandardJSONSchema;
  enum?: string[];
}

/**
 * Recursively converts the AI-generated "property_list" format back to 
 * standard JSON Schema format.
 * * It traverses down through objects and arrays to ensure all nested 
 * children are correctly transformed.
 */
export function convertToStandardSchema(node: AIGeneratedSchemaNode): StandardJSONSchema {
  // 1. Base Properties
  const schema: StandardJSONSchema = {
    type: node.type,
  };

  if (node.description) {
    schema.description = node.description;
  }

  // 2. Handle Object Type (Convert properties_list -> properties map)
  if (node.type === 'object' && node.properties_list) {
    schema.properties = {};
    schema.required = [];
    schema.additionalProperties = false; // Standard practice for Strict JSON

    node.properties_list.forEach((prop) => {
      // RECURSION START: Convert the child value before assigning
      schema.properties![prop.key] = convertToStandardSchema(prop.value);

      // Add to required array if flag is true
      if (prop.required) {
        schema.required!.push(prop.key);
      }
    });

    // Cleanup: Remove empty required array if no fields are required
    if (schema.required.length === 0) {
      delete schema.required;
    }
  }

  // 3. Handle Array Type (RECURSION START: items)
  if (node.type === 'array' && node.items) {
    schema.items = convertToStandardSchema(node.items);
  }

  // 4. Handle Enums
  if (node.enum_values && node.enum_values.length > 0) {
    schema.enum = node.enum_values;
  }

  return schema;
}

/**
 * Helper to parse the full API response from your endpoint.
 * Handles the top-level destructuring and parsing of the example string.
 */
export function parseGeneratedSchemaResponse(response: any) {
  if (!response || !response.json_schema) {
    throw new Error("Invalid response format: missing json_schema");
  }

  const { json_schema, json_example } = response;

  return {
    schema: {
      name: json_schema.name,
      strict: json_schema.strict,
      schema: convertToStandardSchema(json_schema.schema)
    },
    // Parse the stringified JSON example back into a real object
    example: json_example ? JSON.parse(json_example) : null
  };
}