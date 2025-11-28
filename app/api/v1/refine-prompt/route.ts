import { checkReferer, checkUserAgent, unauthorizedResponse } from '@/lib/api-utils';
import { groqPrompt, openRouterPrompt } from '@/lib/llm';
import { NextRequest, NextResponse } from 'next/server';

const REFINE_PROMPT_SYSTEM_PROMPT = `
You are an expert Prompt Engineer and AI Logic Architect. Your goal is to rewrite vague or simple user inputs into highly effective, production-ready LLM prompts.

**YOUR INSTRUCTIONS:**
1. Analyze the user's raw prompt and their desired output format (Plain Text, Markdown, or JSON).
2. Apply best practices:
   - Assign a specific PERSONA/ROLE (e.g., "You are a senior financial analyst").
   - Define the PERSONALITY AND TONE of the role to generate the output in the desired style.
   - Define clear CONSTRAINTS and negative constraints (what NOT to do).
   - Establish the CONTEXT.
   - If the output is JSON, ensure the prompt explicitly mentions data structure and strict adherence in the SYSTEM message.
3. Split the logic into the optimal OpenAI "messages" array format:
   - "system": Contains the persona, core rules, and output format instructions.
   - "user": Contains the dynamic input variables and the specific trigger task. Example: "Generate a book summary from the following book: {{book_title}} by {{author_name}}".
4. Return your response in valid JSON format.

**OUTPUT JSON STRUCTURE:**
{
  "rationale": "A brief explanation of why you made these changes.",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "input_variables": ["book_title", "author_name"]
}
`;

const REFINED_PROMPT_JSON_RESPONSE_SCHEMA = {
  name: 'optimize_prompt_response',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      rationale: {
        type: 'string',
        description: 'A brief explanation of why specific changes were made to the original prompt (e.g., added persona, clarified constraints, fixed tone).'
      },
      messages: {
        type: 'array',
        description: 'The optimized prompt structure split into standard OpenAI system and user roles.',
        items: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'The role of the message sender. usually "system" for instructions and "user" for the task trigger.',
              enum: ['system', 'user']
            },
            content: {
              type: 'string',
              description: 'The optimized text content of the message.'
            }
          },
          required: ['role', 'content'],
          additionalProperties: false
        }
      },
      input_variables: {
        type: 'array',
        description: 'A list of dynamic placeholders or variables detected in the prompt (e.g., "{{topic}}", "{{date}}"). Return an empty array if none.',
        items: {
          type: 'string'
        }
      }
    },
    required: ['rationale', 'messages', 'input_variables'],
    additionalProperties: false
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
    const { initialPrompt, outputFormat } = await request.json();

    if (!initialPrompt) {
      return NextResponse.json({ error: 'Initial prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const startTime = Date.now();
    const payload = {
      // model: 'x-ai/grok-4.1-fast:free',
      // model: 'openai/gpt-5.1',
      model: 'openai/gpt-oss-120b',
      temperature: 1.5,
      messages: [
        {
          role: 'system',
          content: REFINE_PROMPT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Raw Prompt: "${initialPrompt}"\nDesired Output Format: "${outputFormat || 'Plain Text'}"`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: REFINED_PROMPT_JSON_RESPONSE_SCHEMA
      }
    }
    // const response = await openRouterPrompt(payload);
    const response = await groqPrompt(payload);
    const data = response.data;
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    console.log(`llm.prompt: responseTime=${responseTime}ms: response=${JSON.stringify(data)}`);

    if (!response.ok) {
      console.error('OpenAI API Error:');
      return NextResponse.json({ error: 'Failed to fetch from AI', rawResponse: data }, { status: 500 });
    }
    
    let refinedPrompt;
    try {
      refinedPrompt = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing refined prompt:', error);
      return NextResponse.json({ error: 'Failed to parse refined prompt', rawResponse: data }, { status: 500 });
    }

    return NextResponse.json(refinedPrompt);

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}