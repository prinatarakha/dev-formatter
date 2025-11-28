import { checkReferer, checkUserAgent, unauthorizedResponse } from '@/lib/api-utils';
import { groqPrompt } from '@/lib/llm';
import { convertToStandardSchema } from '@/lib/schema-utils';
import { NextRequest, NextResponse } from 'next/server';

export const SCHEMA_GENERATOR_SYSTEM_PROMPT = `
You are a Senior Data Architect specializing in OpenAI's "Structured AI Prompt Outputs" API. Your task is to generate a valid JSON Schema object based on a prompt's intent, AND provide a realistic JSON example.

**CRITICAL: OUTPUT STRUCTURE**
Your response must strictly follow the defined output schema, which requires two main fields:
1. "json_schema": The definition of the schema using the specific format rules below.
2. "json_example": A stringified JSON object representing a valid use case of that schema.

**CRITICAL: SCHEMA DEFINITION RULES (The "Meta-Schema")**
To ensure strict validation compatibility, you must output the schema using a specific **"Property List"** format instead of the standard JSON Schema "properties" map.

1. **Object Fields:**
   - INCORRECT: "properties": { "myField": { "type": "string" } }
   - CORRECT: "properties_list": [ { "key": "myField", "value": { "type": "string", "description": "..." }, "required": true } ]

2. **Validation:**
   - Do NOT include "additionalProperties" or top-level "required" arrays in your output.
   - Instead, mark specific fields as "required": true within the property list item.
   - Enums should be used in the "value" object where values are predictable.

3. **Inference:**
   - Analyze the "Optimized Prompt" to understand data entities.
   - If an "Example JSON" is provided, use it to infer keys and types exactly.
   - If no example is provided, infer the most logical structure.

**EXAMPLE OUTPUT:**
{
  "json_schema": {
    "name": "user_profile_response",
    "strict": true,
    "schema": {
      "type": "object",
      "description": "Root object",
      "properties_list": [
        {
          "key": "users",
          "required": true,
          "value": {
            "type": "array",
            "description": "List of users",
            "items": {
               "type": "object",
               "description": "Single user profile",
               "properties_list": [
                  { "key": "id", "value": { "type": "integer", "description": "User ID" }, "required": true },
                  { "key": "name", "value": { "type": "string", "description": "Full name" }, "required": true }
               ]
            }
          }
        }
      ]
    }
  },
  "json_example": "{\"users\": [{\"id\": 1,\"name\":\"Alice\"}]}"
}`;

export const GENERATE_JSON_SCHEMA_RESPONSE_SCHEMA = {
  name: 'generate_json_schema_response',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      json_schema: {
        type: 'object',
        description: 'The structured schema definition for the JSON response.',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the schema (e.g., "weather_response").'
          },
          strict: {
            type: 'boolean',
            const: true,
            description: 'Must always be true.'
          },
          schema: {
            $ref: '#/$defs/schema_node'
          }
        },
        required: ['name', 'strict', 'schema'],
        additionalProperties: false
      },
      json_example: {
        type: 'string',
        description: 'A stringified JSON object representing a valid example data structure that adheres to the generated schema.'
      }
    },
    required: ['json_schema', 'json_example'],
    additionalProperties: false,
    $defs: {
      schema_node: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['object', 'array', 'string', 'number', 'boolean', 'integer'],
            description: 'The data type of this field.'
          },
          description: {
            type: 'string',
            description: 'Description of what this field contains.'
          },
          // FIX: Allow null and required
          properties_list: {
            anyOf: [
              {
                type: 'array',
                description: 'List of fields if type is object.',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', description: 'The field name.' },
                    value: { $ref: '#/$defs/schema_node' },
                    required: { type: 'boolean', description: 'Is this field required?' }
                  },
                  required: ['key', 'value', 'required'],
                  additionalProperties: false
                }
              },
              { type: 'null' }
            ]
          },
          // FIX: Allow null and required
          items: {
            anyOf: [
              { $ref: '#/$defs/schema_node' },
              { type: 'null' }
            ]
          },
          // FIX: Allow null and required
          enum_values: {
            anyOf: [
              {
                type: 'array',
                items: { type: 'string' },
                description: 'Allowed values.'
              },
              { type: 'null' }
            ]
          }
        },
        // CRITICAL: All fields (including nullable ones) must be listed here
        required: ['type', 'description', 'properties_list', 'items', 'enum_values'],
        additionalProperties: false
      }
    }
  }
};

export async function POST(request: NextRequest) {
  // Check referer authentication
  if (!checkReferer(request)) {
    return unauthorizedResponse();
  }

  // Check user agent authentication
  if (!checkUserAgent(request)) {
    return unauthorizedResponse();
  }

  try {
    const { messages, userExample } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Valid messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const userPrompt = `
**Optimized Prompt:**
${JSON.stringify(messages)}

**User Provided Example (Optional):**
${userExample ? JSON.stringify(userExample) : "None provided"}`

    const startTime = Date.now();
    const payload = {
      // model: 'x-ai/grok-4.1-fast:free',
      // model: 'openai/gpt-5.1',
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: SCHEMA_GENERATOR_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      response_format: { 
        type: 'json_schema',
        json_schema: GENERATE_JSON_SCHEMA_RESPONSE_SCHEMA
      }
    };
    const response = await groqPrompt(payload);
    const data = response.data;
  
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    console.log(`llm.prompt: responseTime=${responseTime}ms: response=${JSON.stringify(data)}`);

    if (!response.ok) {
      console.error('OpenAI API Error:');
      return NextResponse.json({ error: 'Failed to fetch from AI', rawResponse: data }, { status: response.status });
    }

    let rawResult;
    try {
      rawResult = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing raw result:', error);
      return NextResponse.json({ error: 'Failed to parse raw result', rawResponse: data.choices[0].message.content }, { status: 500 });
    }

    // Destructure the new format
    const { json_schema, json_example } = rawResult;

    // Convert the "Meta-Schema" (properties_list) back to Standard JSON Schema
    const standardSchema = {
      name: json_schema.name,
      strict: json_schema.strict,
      schema: convertToStandardSchema(json_schema.schema)
    };

    // Parse the stringified example back to JSON
    let jsonExampleStr;
    console.log(`Attempting to parse JSON example`);
    try {
      const parsedJson = JSON.parse(json_example);
      jsonExampleStr = JSON.stringify(parsedJson, null, 2);
      console.log(`Successfully parsed JSON example`);
    } catch (error) {
      console.error('Error parsing JSON example:', error);
      jsonExampleStr = json_example;
    }

    // Return both to the frontend
    return NextResponse.json({
      schema: standardSchema,
      exampleStr: jsonExampleStr
    });

  } catch (error: any) {
    console.error('API Route Error:', error.message);
    console.error('API Route Error:', error.stack);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}