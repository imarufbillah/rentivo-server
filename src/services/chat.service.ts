import { ChatMessage } from '../types';
import { tools, executeToolCall } from './chat-tools';

const SYSTEM_PROMPT = `You are a helpful real estate assistant for Rentivo, a property rental platform. You help users find rental properties, answer questions about listings, and provide information about saved properties.

You have access to three tools:
1. searchProperties - Search for properties by criteria
2. getPropertyDetails - Get detailed info about a specific property
3. getUserSavedProperties - Get the user's saved/favorited properties

Guidelines:
- Always use tools to fetch current data rather than making assumptions
- Be concise but informative
- If a tool call fails, explain clearly what went wrong
- Never fabricate property data
- When showing multiple properties, limit to 3-5 in your response
- Format prices with dollar signs and commas
- Use a friendly, professional tone`;

const MAX_HISTORY = 20;

const conversationStore = new Map<string, ChatMessage[]>();

const getConversationHistory = (sessionId: string): ChatMessage[] => {
  return conversationStore.get(sessionId) || [];
};

const addToConversationHistory = (sessionId: string, message: ChatMessage) => {
  const history = getConversationHistory(sessionId);
  history.push(message);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  conversationStore.set(sessionId, history);
};

export const sendMessage = async function* (
  userId: string,
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  const sessionId = userId;
  const conversationHistory = getConversationHistory(sessionId);

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...conversationHistory,
    ...history,
    { role: 'user' as const, content: message },
  ];

  addToConversationHistory(sessionId, { role: 'user', content: message });

  const Groq = (await import('groq-sdk')).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    tools,
    stream: true,
  });

  let fullContent = '';
  const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

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

  if (toolCalls.size > 0) {
    const toolResults = new Map<string, string>();

    for (const [, tc] of toolCalls) {
      yield JSON.stringify({ type: 'tool_call', tool: tc.name, args: tc.arguments });

      try {
        const args = JSON.parse(tc.arguments);
        const result = await executeToolCall(tc.name, args, userId);
        const resultContent = JSON.stringify(result);
        toolResults.set(tc.id, resultContent);
        yield JSON.stringify({ type: 'tool_result', result });

        addToConversationHistory(sessionId, {
          role: 'assistant',
          content: `Called ${tc.name} and got results`,
        });
      } catch (error) {
        const errorContent = JSON.stringify({ error: `Failed to execute ${tc.name}: ${error instanceof Error ? error.message : 'unknown error'}` });
        toolResults.set(tc.id, errorContent);
        yield JSON.stringify({
          type: 'tool_result',
          result: { error: `Failed to execute ${tc.name}` },
        });
      }
    }

    const toolMessages: any[] = [
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

    const followUp = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: toolMessages,
      stream: true,
    });

    let followUpContent = '';
    for await (const chunk of followUp) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        followUpContent += delta.content;
        yield JSON.stringify({ type: 'token', content: delta.content });
      }
    }

    addToConversationHistory(sessionId, { role: 'assistant', content: followUpContent });
  } else {
    addToConversationHistory(sessionId, { role: 'assistant', content: fullContent });
  }

  yield JSON.stringify({ type: 'done' });
};

export const generateFollowUpSuggestions = async (history: ChatMessage[]): Promise<string[]> => {
  const Groq = (await import('groq-sdk')).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Based on this conversation, suggest 2-3 short follow-up questions the user might ask (max 8 words each):

${JSON.stringify(history.slice(-4), null, 2)}

Return as JSON array: ["suggestion 1", "suggestion 2", "suggestion 3"]`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions":[]}');
    return result.suggestions || [];
  } catch {
    return [];
  }
};

export const clearConversationHistory = (sessionId: string) => {
  conversationStore.delete(sessionId);
};
