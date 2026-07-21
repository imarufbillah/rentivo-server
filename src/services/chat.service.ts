import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types/index.js';
import { executeToolCall } from './chat-tools.js';

const debug = (label: string, data?: unknown) => {
  const ts = new Date().toISOString();
  const extra = data !== undefined ? ` ${JSON.stringify(data, null, 2)}` : '';
  console.log(`[CHAT-DEBUG ${ts}] ${label}${extra}`);
};

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

const getAIClient = () => {
  const key = process.env.GEMINI_API_KEY;
  debug('getAIClient', { hasKey: !!key, keyPrefix: key ? key.substring(0, 8) + '...' : 'MISSING' });
  return new GoogleGenAI({ apiKey: key });
};

const toGeminiContents = (
  messages: { role: string; content: string }[]
): { systemInstruction: string; contents: { role: string; parts: { text: string }[] }[] } => {
  const systemMsg = messages.find((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');

  return {
    systemInstruction: systemMsg?.content || '',
    contents: nonSystem.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  };
};

const streamToString = async function* (
  ai: GoogleGenAI,
  msgs: { role: string; content: string }[]
): AsyncGenerator<string> {
  const { systemInstruction, contents } = toGeminiContents(msgs);
  debug('streamToString: calling generateContentStream', { model: 'gemini-2.5-flash', contentsCount: contents.length });

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config: { systemInstruction },
  });

  debug('streamToString: stream created, iterating chunks');

  let fullContent = '';

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      fullContent += text;
      yield JSON.stringify({ type: 'token', content: text });
    }
  }

  debug('streamToString: done, fullContent length', { length: fullContent.length });
  return fullContent;
};

export const sendMessage = async function* (
  userId: string,
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  debug('sendMessage: called', { userId, message: message.substring(0, 100), historyLength: history.length });
  const ai = getAIClient();

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  let fullContent = '';

  try {
    const result = yield* streamToString(ai, messages);
    fullContent = result || '';
  } catch (error) {
    debug('sendMessage: streamToString ERROR', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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

    const followUpMessages: { role: string; content: string }[] = [
      { role: 'system', content: 'You received property data from tools. Format and present ONLY the properties from these results as a numbered list. Do NOT invent any additional properties. If results are empty, say "No properties match those criteria." Format: Title, Location, $Price/mo, Type.' },
      ...messages.filter((m) => m.role !== 'system'),
      { role: 'user', content: `Tool results:\n${toolResults.join('\n')}\n\nPresent these results to the user now.` },
    ];

    try {
      const { systemInstruction, contents } = toGeminiContents(followUpMessages);

      const followUpStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: { systemInstruction },
      });

      for await (const chunk of followUpStream) {
        const text = chunk.text;
        if (text && !text.includes('<tool_call>')) {
          yield JSON.stringify({ type: 'token', content: text });
        }
      }
    } catch (error) {
      debug('sendMessage: followUp stream ERROR', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      yield JSON.stringify({
        type: 'token',
        content: '\n\nI found some results but had trouble summarizing them. Please try asking again.',
      });
    }
  }

  yield JSON.stringify({ type: 'done' });
};

export const generateFollowUpSuggestions = async (history: ChatMessage[]): Promise<string[]> => {
  const ai = getAIClient();

  const prompt = `Based on this conversation about rental properties, suggest 2-3 short follow-up questions the user might ask (max 8 words each).

Conversation:
${JSON.stringify(history.slice(-4), null, 2)}

Return ONLY a JSON object: {"suggestions": ["question 1", "question 2", "question 3"]}`;

  try {
    debug('generateFollowUpSuggestions: calling generateContent', { model: 'gemini-2.5-flash' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    debug('generateFollowUpSuggestions: response received', { text: response.text?.substring(0, 200) });
    const result = JSON.parse(response.text || '{"suggestions":[]}');
    return result.suggestions || [];
  } catch (error) {
    debug('generateFollowUpSuggestions: ERROR', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
};

export const clearConversationHistory = (_sessionId: string) => {
  // No-op: conversation context is managed by the client
};
