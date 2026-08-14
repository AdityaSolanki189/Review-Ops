import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { env, isOpenRouterConfigured } from '@/lib/config/env'

export const openrouter = isOpenRouterConfigured()
    ? createOpenRouter({
          apiKey: env.OPENROUTER_API_KEY,
      })
    : null

export function getOpenRouterModel() {
    if (!openrouter) {
        throw new Error('OPENROUTER_API_KEY is not configured')
    }

    return openrouter(env.OPENROUTER_MODEL)
}

export function getOpenRouterEmbeddingModel() {
    if (!openrouter) {
        throw new Error('OPENROUTER_API_KEY is not configured')
    }

    return openrouter.textEmbeddingModel(env.OPENROUTER_EMBEDDING_MODEL)
}

export function isEmbeddingConfigured(): boolean {
    return isOpenRouterConfigured()
}
