import { ChatMessage } from '../types';
import { tools, executeToolCall } from './chat-tools';

const SYSTEM_PROMPT = `You are a helpful real estate assistant for Rentivo, a property rental platform in New York City. You help users find rental properties, answer questions about listings, and provide information about saved properties.

You have access to three tools:
1. searchProperties - Search for properties by criteria (location, price, type). ONLY call this when the user explicitly wants to find, see, or browse properties.
2. getPropertyDetails - Get detailed info about a specific property by its ID. ONLY call this when the user asks about a specific property they've already seen.
3. getUserSavedProperties - Get the user's saved/favorited properties. ONLY call this when the user asks about their saved or favorited listings.

Rules:
- NEVER fabricate property listings, prices, or availability — always use tools for real data
- Use tools ONLY when the user's request requires fetching data from the database
- For general questions about renting, neighborhoods, or real estate advice — answer directly from your knowledge WITHOUT calling any tool
- When showing search results, format as a numbered list with title, location, price, and type
- Format prices with dollar signs and commas (e.g. $2,500/mo)
- Use a friendly, professional tone
- Handle short follow-up messages (like "Near subway?", "Best areas", "What about price?") by understanding them in context of the previous conversation — do NOT ask the user to clarify what they mean
- Always respond in the same language the user writes in`;

const createClient = async () => {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const streamChat = async function* (
  client: Awaited<ReturnType<typeof createClient>>,
  msgs: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }[]
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: msgs,
    tools,
    stream: true,
  });

  let fullContent = '';
  const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index ?? 0;
          const existing = toolCalls.get(index);

          if (existing) {
            existing.arguments += tc.function?.arguments || '';
          } else {
            toolCalls.set(index, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            });
          }
        }
      }

      if (delta?.content) {
        fullContent += delta.content;
        yield JSON.stringify({ type: 'token', content: delta.content });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown stream error';

    if (msg.includes('tool call validation failed') || msg.includes('did not match schema')) {
      yield JSON.stringify({
        type: 'error',
        message: 'I had trouble forming that search. Let me try a simpler query.',
      });
      return;
    }

    throw error;
  }

  return { fullContent, toolCalls };
};

export const sendMessage = async function* (
  userId: string,
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  const client = await createClient();

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];

  let fullContent = '';
  const toolCalls = new Map<string, { id: string; name: string; arguments: string }>();

  try {
    const result = yield* streamChat(client, messages);
    if (!result) {
      yield JSON.stringify({ type: 'done' });
      return;
    }

    fullContent = result.fullContent;
    for (const [index, tc] of result.toolCalls) {
      toolCalls.set(tc.id || String(index), tc);
    }
  } catch {
    yield JSON.stringify({ type: 'done' });
    return;
  }

  if (toolCalls.size > 0) {
    const toolResults = new Map<string, string>();

    for (const [, tc] of toolCalls) {
      yield JSON.stringify({ type: 'tool_call', tool: tc.name, args: tc.arguments });

      try {
        const args = JSON.parse(tc.arguments);
        const toolResult = await executeToolCall(tc.name, args, userId);
        const resultContent = JSON.stringify(toolResult);
        toolResults.set(tc.id, resultContent);
        yield JSON.stringify({ type: 'tool_result', result: toolResult });
      } catch (error) {
        const errorContent = JSON.stringify({ error: `Failed to execute ${tc.name}: ${error instanceof Error ? error.message : 'unknown error'}` });
        toolResults.set(tc.id, errorContent);
        yield JSON.stringify({
          type: 'tool_result',
          result: { error: `Failed to execute ${tc.name}` },
        });
      }
    }

    const toolMessages: { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }[] = [
      ...messages,
      ...Array.from(toolCalls.values()).map((tc) => ({
        role: 'assistant',
        content: null,
        tool_calls: [{ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } }],
      })),
      ...Array.from(toolCalls.values()).map((tc) => ({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolResults.get(tc.id) || 'No result',
      })),
    ];

    let followUpContent = '';
    try {
      const followUp = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: toolMessages,
        stream: true,
      });

      for await (const chunk of followUp) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          followUpContent += delta.content;
          yield JSON.stringify({ type: 'token', content: delta.content });
        }
      }
    } catch {
      yield JSON.stringify({
        type: 'token',
        content: '\n\nI found some results but had trouble summarizing them. Please try asking again.',
      });
    }
  } else {
    // no tool calls — fullContent already streamed
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
