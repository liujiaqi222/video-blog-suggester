import { serverEnv } from "@/data/serverEnv";
import { createOpenAI } from "@ai-sdk/openai";


export function getEmbeddingModel() {
    const provider = createOpenAI({
        baseURL: serverEnv.EMBEDDING_BASE_URL,
        apiKey: serverEnv.EMBEDDING_API_KEY
    })
    return provider.embedding(serverEnv.EMBEDDING_PROVIDER )

}