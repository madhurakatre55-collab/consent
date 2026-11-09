import { z } from 'zod';
import { config } from '../config/env.js';
import { mockCompileMandate } from './mock.js';
import { MandateSchema } from '../policy/mandateSchema.js';

export class LLMValidationError extends Error {
  public issues: z.ZodIssue[];
  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = 'LLMValidationError';
    this.issues = issues;
  }
}

/**
 * High-level LLM completion abstraction with strict schema enforcement.
 * If output fails Zod validation, throws LLMValidationError.
 */
export async function llmComplete<T>(
  prompt: string,
  schema: z.ZodType<T>,
  systemInstruction: string = 'You are an accurate spending mandate compiler. Output only valid JSON.'
): Promise<T> {
  const provider = config.llmProvider;
  const apiKey = config.llmApiKey;

  // 1. Mock / offline mode
  if (provider === 'mock' || !apiKey) {
    // If schema matches MandateSchema, use deterministic compiler
    if ((schema as any) === MandateSchema || (schema as any)._def?.shape?.monthly_budget) {
      const mockResult = mockCompileMandate(prompt);
      const parseResult = schema.safeParse(mockResult);
      if (!parseResult.success) {
        throw new LLMValidationError(
          `Validation failed for compiled mandate: ${parseResult.error.message}`,
          parseResult.error.issues
        );
      }
      return parseResult.data;
    }

    // Default mock json
    try {
      const fallback = mockCompileMandate(prompt);
      return fallback as unknown as T;
    } catch {
      throw new Error('Mock LLM was unable to generate a valid schema for this prompt.');
    }
  }

  // 2. Google Gemini API Provider
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.llmModel}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}\n\nReturn strictly valid JSON matching the requested schema.` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned an empty response.');
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(text);
    } catch (err: any) {
      throw new Error(`Failed to parse LLM JSON response: ${err.message}`);
    }

    const validation = schema.safeParse(parsedJson);
    if (!validation.success) {
      throw new LLMValidationError(
        `LLM output failed policy schema validation: ${validation.error.message}`,
        validation.error.issues
      );
    }

    return validation.data;
  }

  // 3. Fallback or generic OpenAI compatible
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.llmModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${systemInstruction} Response must be strictly raw JSON.` },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new LLMValidationError(
      `LLM output failed policy schema validation: ${validation.error.message}`,
      validation.error.issues
    );
  }

  return validation.data;
}
