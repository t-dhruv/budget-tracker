import { AIModelInfo, AI_PROVIDER } from '@bt/shared/types';

import { AI_MODEL_ID } from '../model-ids';

export const NVIDIA_MODELS: Record<Extract<AI_MODEL_ID, `nvidia/${string}`>, AIModelInfo> = {
  [AI_MODEL_ID['nvidia/meta/llama-3.2-3b-instruct']]: {
    id: AI_MODEL_ID['nvidia/meta/llama-3.2-3b-instruct'],
    name: 'Llama 3.2 3B',
    provider: AI_PROVIDER.nvidia,
    description: 'Lightweight model via NVIDIA, fast for simple tasks',
    contextWindow: 128_000,
    capabilities: ['text-generation', 'structured-output', 'function-calling'],
    costTier: 'low',
    pricing: { inputPerMillion: 0.05, outputPerMillion: 0.05 },
  },
  [AI_MODEL_ID['nvidia/meta/llama-3.1-405b-instruct']]: {
    id: AI_MODEL_ID['nvidia/meta/llama-3.1-405b-instruct'],
    name: 'Llama 3.1 405B',
    provider: AI_PROVIDER.nvidia,
    description: 'Most capable Llama model via NVIDIA, great for complex reasoning',
    contextWindow: 128_000,
    capabilities: ['text-generation', 'structured-output', 'function-calling'],
    costTier: 'high',
    pricing: { inputPerMillion: 3.5, outputPerMillion: 15 },
  },
  [AI_MODEL_ID['nvidia/meta/llama-3.1-70b-instruct']]: {
    id: AI_MODEL_ID['nvidia/meta/llama-3.1-70b-instruct'],
    name: 'Llama 3.1 70B',
    provider: AI_PROVIDER.nvidia,
    description: 'Strong balance of quality and speed, good for parsing tasks',
    contextWindow: 128_000,
    capabilities: ['text-generation', 'structured-output', 'function-calling'],
    costTier: 'medium',
    pricing: { inputPerMillion: 0.9, outputPerMillion: 0.9 },
  },
  [AI_MODEL_ID['nvidia/meta/llama-3.1-8b-instruct']]: {
    id: AI_MODEL_ID['nvidia/meta/llama-3.1-8b-instruct'],
    name: 'Llama 3.1 8B',
    provider: AI_PROVIDER.nvidia,
    description: 'Fast and affordable, excellent for categorization tasks',
    contextWindow: 128_000,
    capabilities: ['text-generation', 'structured-output', 'function-calling'],
    costTier: 'low',
    pricing: { inputPerMillion: 0.1, outputPerMillion: 0.1 },
  },
};
