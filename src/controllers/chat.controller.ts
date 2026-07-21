import { Request, Response } from 'express';
import * as chatService from '../services/chat.service.js';
import { chatMessageSchema, chatSuggestionsSchema } from '../lib/validation/chat.schemas.js';
import { logValidationError, logControllerError } from '../lib/logger.js';

const debug = (label: string, data?: unknown) => {
  const ts = new Date().toISOString();
  const extra = data !== undefined ? ` ${JSON.stringify(data, null, 2)}` : '';
  console.log(`[CHAT-CTRL-DEBUG ${ts}] ${label}${extra}`);
};

export const sendMessage = async (req: Request, res: Response) => {
  debug('sendMessage: incoming request', { userId: req.user?.id, body: req.body });
  try {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'sendMessage');
      debug('sendMessage: validation failed', { issues: parsed.error.issues });
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    debug('sendMessage: SSE headers set, starting stream');

    const stream = chatService.sendMessage(
      req.user!.id,
      parsed.data.message,
      parsed.data.conversationHistory || []
    );

    for await (const chunk of stream) {
      debug('sendMessage: writing chunk', { chunk: chunk.substring(0, 200) });
      res.write(`data: ${chunk}\n\n`);
    }

    debug('sendMessage: stream complete');
    res.end();
  } catch (error) {
    debug('sendMessage: CONTROLLER ERROR', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logControllerError(req, error, 'sendMessage');

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'An error occurred while processing your message.' })}\n\n`);
      res.end();
      return;
    }

    const isLLMError = error instanceof Error && (
      error.message.includes('google') ||
      error.message.includes('generativelanguage') ||
      error.message.includes('GEMINI') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('503') ||
      error.message.includes('502') ||
      error.message.includes('rate_limit') ||
      error.message.includes('overloaded')
    );

    if (isLLMError) {
      res.status(503).json({
        success: false,
        error: { code: 'LLM_SERVICE_UNAVAILABLE', message: 'The AI assistant is temporarily unavailable. Please try again later.' },
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat message' },
      });
    }
  }
};

export const getSuggestions = async (req: Request, res: Response) => {
  debug('getSuggestions: incoming request', { body: req.body });
  try {
    const parsed = chatSuggestionsSchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'getSuggestions');
      debug('getSuggestions: validation failed', { issues: parsed.error.issues });
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const suggestions = await chatService.generateFollowUpSuggestions(parsed.data.conversationHistory);
    debug('getSuggestions: success', { suggestions });
    res.json({ success: true, data: { suggestions } });
  } catch (error) {
    debug('getSuggestions: CONTROLLER ERROR', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logControllerError(req, error, 'getSuggestions');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate suggestions' },
    });
  }
};
