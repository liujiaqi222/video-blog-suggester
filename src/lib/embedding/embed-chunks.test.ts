import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embedMany: vi.fn(),
  getEmbeddingModel: vi.fn(),
}));

vi.mock("ai", () => ({ embedMany: mocks.embedMany }));
vi.mock("./get-embedding-model", () => ({
  getEmbeddingModel: mocks.getEmbeddingModel,
}));

import { embedChunks } from "./embed-chunks";

describe("embedChunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the model call when there are no chunks", async () => {
    await expect(embedChunks([])).resolves.toEqual([]);

    expect(mocks.getEmbeddingModel).not.toHaveBeenCalled();
    expect(mocks.embedMany).not.toHaveBeenCalled();
  });

  it("embeds every non-empty chunk", async () => {
    const model = { modelId: "test-embedding-model" };
    const embeddings = [[0.1, 0.2], [0.3, 0.4]];
    mocks.getEmbeddingModel.mockReturnValue(model);
    mocks.embedMany.mockResolvedValue({ embeddings });

    await expect(embedChunks(["first", "second"])).resolves.toEqual(embeddings);

    expect(mocks.getEmbeddingModel).toHaveBeenCalledOnce();
    expect(mocks.embedMany).toHaveBeenCalledWith({
      model,
      values: ["first", "second"],
      maxParallelCalls: 100,
    });
  });
});
