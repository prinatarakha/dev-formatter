const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function groqPrompt(params: { 
  messages: any[], 
  model: string, 
  temperature?: number, 
  jsonSchema?: any
}) {
  const { messages, model, temperature = 1.0, jsonSchema } = params;
  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      response_format: jsonSchema ? {
        type: 'json_schema',
        json_schema: jsonSchema
      } : undefined,
    }),
  });
  const data: any = await response.json();
  return {
    ok: response.ok,
    status: response.status,
    data: data,
  };
}

export async function openRouterPrompt(params: { 
  messages: any[], 
  model: string, 
  temperature?: number, 
  jsonSchema?: any
}) {
  const { messages, model, temperature = 1.0, jsonSchema } = params;
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      response_format: jsonSchema ? {
        type: 'json_schema',
        json_schema: jsonSchema
      } : undefined,
    }),
  });
  const data: any = await response.json();
  return {
    ok: response.ok,
    status: response.status,
    data: data,
  };
}