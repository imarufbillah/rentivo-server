import { Request, Response } from 'express';
import * as chatService from '../services/chat.service';
import { chatMessageSchema, chatSuggestionsSchema } from '../lib/validation/chat.schemas';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = chatService.sendMessage(
      req.user!.id,
      parsed.data.message,
      parsed.data.conversationHistory || []
    );

    for await (const chunk of stream) {
      res.write(`data: ${chunk}\n\n`);
    }

    res.end();
  } catch (error) {
    // Log error details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('\n❌ Chat error caught:');
      console.error('User:', req.user?.email);
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error('Stack:', error.stack);
      }
      console.error('---\n');
    }

    const isLLMError = error instanceof Error && (
      error.message.includes('groq') ||
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
  try {
    const parsed = chatSuggestionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const suggestions = await chatService.generateFollowUpSuggestions(parsed.data.conversationHistory);
    res.json({ success: true, data: { suggestions } });
  } catch (error) {
    // Log error details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('\n❌ Chat suggestions error:');
      console.error('User:', req.user?.email);
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error('Stack:', error.stack);
      }
      console.error('---\n');
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate suggestions' },
    });
  }
};
