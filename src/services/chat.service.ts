import { ChatMessage } from '../types';
import { executeToolCall } from './chat-tools';

const SYSTEM_PROMPT = `You are a helpful real estate assistant for Rentivo, a property rental platform in New York City.

AVAILABLE TOOLS — call them by writing a <tool_call> block (exactly this format, on its own lines):

<tool_call>
{"tool": "searchProperties", "args": {"query": "...", "location": "...", "minPrice": 1000, "maxPrice": 3000, "propertyType": "apartment"}}
</tool_call>

Tools:
1. searchProperties — Search properties. Args (all optional): query, location, minPrice (number), maxPrice (number), propertyType (apartment|house|room|studio|villa)
2. getPropertyDetails — Get details + reviews for a property. Args: {propertyId: "<id>"}  
3. getUserSavedProperties — Get user's saved properties. Args: {}

RULES:
- When the user asks to see, find, or search for properties, ALWAYS call searchProperties. Only include filter arguments the user actually specified — do NOT add default location, price, or type filters unless the user asked for them. An empty args object returns all properties.
- When the user asks about a specific property they've seen, call getPropertyDetails with the property's ID from previous results.
- NEVER invent, fabricate, or make up property listings, names, prices, or availability. ONLY show properties from tool results.
- If tool results are empty, say "No properties match those criteria" and suggest broadening the search.
- Format results as a numbered list: Title, Location, $Price/mo, Type
- For general real estate questions, answer directly without calling any tool.
- Handle short follow-ups ("Near subway?", "Best areas?") by understanding them in context.
- Always respond in the same language the user writes in.`;

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;

const createClient = async () => {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const streamToString = async function* (
  client: Awaited<ReturnType<typeof createClient>>,
  msgs: { role: string; content: string }[]
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: msgs,
    stream: true,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      fullContent += delta.content;
      yield JSON.stringify({ type: 'token', content: delta.content });
    }
  }

  return fullContent;
};

export const sendMessage = async function* (
  userId: string,
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  const client = await createClient();

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  let fullContent = '';

  try {
    const result = yield* streamToString(client, messages);
    fullContent = result || '';
  } catch {
    yield JSON.stringify({ type: 'done' });
    return;
  }

  const toolCalls = new Map<string, { name: string; args: Record<string, unknown> }>();
  let match: RegExpExecArray | null;

  while ((match = TOOL_CALL_REGEX.exec(fullContent)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && parsed.args) {
        const id = `tc-${toolCalls.size}`;
        toolCalls.set(id, { name: parsed.tool, args: parsed.args });
      }
    } catch {
      // skip malformed
    }
  }

  if (toolCalls.size > 0) {
    const toolResults: string[] = [];

    for (const [, tc] of toolCalls) {
      yield JSON.stringify({ type: 'tool_call', tool: tc.name, args: JSON.stringify(tc.args) });

      try {
        const result = await executeToolCall(tc.name, tc.args, userId);
        toolResults.push(JSON.stringify(result));
        yield JSON.stringify({ type: 'tool_result', result });
      } catch (error) {
        const errorStr = JSON.stringify({ error: `Failed to execute ${tc.name}: ${error instanceof Error ? error.message : 'unknown error'}` });
        toolResults.push(errorStr);
        yield JSON.stringify({ type: 'tool_result', result: { error: `Failed to execute ${tc.name}` } });
      }
    }

    const followUpMessages = [
      { role: 'system', content: 'You received property data from tools. Format and present ONLY the properties from these results as a numbered list. Do NOT invent any additional properties. If results are empty, say "No properties match those criteria." Format: Title, Location, $Price/mo, Type.' },
      ...messages.filter((m) => m.role !== 'system'),
      { role: 'user', content: `Tool results:\n${toolResults.join('\n')}\n\nPresent these results to the user now.` },
    ];

    try {
      const followUp = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: followUpMessages,
        stream: true,
      });

      for await (const chunk of followUp) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content && !delta.content.includes('<tool_call>')) {
          yield JSON.stringify({ type: 'token', content: delta.content });
        }
      }
    } catch {
      yield JSON.stringify({
        type: 'token',
        content: '\n\nI found some results but had trouble summarizing them. Please try asking again.',
      });
    }
  }

  yield JSON.stringify({ type: 'done' });
};

export const generateFollowUpSuggestions = async (history: ChatMessage[]): Promise<string[]> => {
  const client = await createClient();

  const prompt = `Based on this conversation about rental properties, suggest 2-3 short follow-up questions the user might ask (max 8 words each).

Conversation:
${JSON.stringify(history.slice(-4), null, 2)}

Return ONLY a JSON object: {"suggestions": ["question 1", "question 2", "question 3"]}`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions":[]}');
    return result.suggestions || [];
  } catch {
    return [];
  }
};

export const clearConversationHistory = (_sessionId: string) => {
  // No-op: conversation context is managed by the client
};
