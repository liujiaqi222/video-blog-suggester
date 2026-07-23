import { serverEnv } from "@/data/serverEnv";
import { createOpenAI } from "@ai-sdk/openai";


export function getEmbeddingModel() {
    const provider = createOpenAI({
        baseURL: serverEnv.EMBEDDING_BASE_URL
    })
    return provider.embedding(serverEnv.EMBEDDING_PROVIDER )

}