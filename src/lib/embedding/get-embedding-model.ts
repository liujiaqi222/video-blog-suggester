import { serverEnv } from "@/data/serverEnv";
import { createOpenAI, openai } from "@ai-sdk/openai";


const QWEN_LOCAL_MODEL = 'text-embedding-qwen3-embedding-0.6b'
const QWEN_SF_MODEL = 'Qwen/Qwen3-Embedding-8B'


export function getEmbeddingModel() {
    const provider = createOpenAI({
        baseURL: serverEnv.EMBEDDING_BASE_URL
    })
    return provider.embedding(serverEnv.EMBEDDING_PROVIDER === 'qwen-0.6b-local' ? QWEN_LOCAL_MODEL : QWEN_SF_MODEL)

}