import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
  embedChunks: vi.fn(),
}));

vi.mock("@/db/db", () => ({ db: mocks.db }));
vi.mock("@/lib/embedding/embed-chunks", () => ({
  embedChunks: mocks.embedChunks,
}));

import { ingestArticle } from "./ingest-webdevsimplified";

const article = {
  title: "A useful article",
  description: "An article description",
  publishDate: new Date("2025-02-03T12:00:00.000Z"),
  url: "https://example.com/articles/useful",
};

const articleHtml = `
  <html>
    <head><meta property="og:image" content="https://example.com/thumbnail.png" /></head>
    <body>
      <article><main>
        <p>Introduction text.</p>
        <h2>Second section</h2>
        <p>More text.</p>
        <script>ignored()</script>
      </main></article>
    </body>
  </html>`;

function mockExistingContent(existing: unknown) {
  const limit = vi.fn().mockResolvedValue(existing ? [existing] : []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mocks.db.select.mockReturnValue({ from });
}

function mockTransaction(insertedContent: { id: string } | undefined) {
  const returning = vi
    .fn()
    .mockResolvedValue(insertedContent ? [insertedContent] : []);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const contentValues = vi.fn(() => ({ onConflictDoNothing }));
  const chunkValues = vi.fn().mockResolvedValue(undefined);
  const tx = {
    insert: vi.fn((table) =>
      table === undefined ? undefined : { values: contentValues },
    ),
  };

  // The first insert is content; replace the builder for chunk insertion after it.
  tx.insert.mockImplementationOnce(() => ({ values: contentValues }));
  tx.insert.mockImplementationOnce(() => ({ values: chunkValues }));
  mocks.db.transaction.mockImplementation(async (callback) => callback(tx));

  return { chunkValues, contentValues, onConflictDoNothing, returning, tx };
}

describe("ingestArticle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.db.select.mockReset();
    mocks.db.transaction.mockReset();
    mocks.embedChunks.mockReset();
    mocks.embedChunks.mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("skips an article that already exists without fetching or starting a transaction", async () => {
    mockExistingContent({ id: "existing-content" });

    await expect(ingestArticle(article)).resolves.toEqual({ ingested: false });

    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rejects a failed article response", async () => {
    mockExistingContent(undefined);
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 502 }));

    await expect(ingestArticle(article)).rejects.toThrow(
      "Unable to fetch article https://example.com/articles/useful: 502",
    );
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rejects a page without an article main element", async () => {
    mockExistingContent(undefined);
    vi.mocked(fetch).mockResolvedValue(
      new Response("<article><p>No main</p></article>"),
    );

    await expect(ingestArticle(article)).rejects.toThrow(
      "Article main element was not found for https://example.com/articles/useful",
    );
  });

  it("stores parsed content and chunks when the article is new", async () => {
    mockExistingContent(undefined);
    const transaction = mockTransaction({ id: "new-content" });
    vi.mocked(fetch).mockResolvedValue(new Response(articleHtml));

    await expect(ingestArticle(article)).resolves.toEqual({ ingested: true });

    expect(transaction.contentValues).toHaveBeenCalledWith({
      title: article.title,
      description: article.description,
      publishDate: new Date(article.publishDate),
      url: article.url,
      thumbnailUrl: "https://example.com/thumbnail.png",
      type: "article",
      content: expect.stringContaining("Introduction text."),
    });
    expect(transaction.onConflictDoNothing).toHaveBeenCalledOnce();
    expect(transaction.chunkValues).toHaveBeenCalledWith([
      {
        contentId: "new-content",
        text: "Introduction text.",
        embedding: [0.1, 0.2],
      },
      {
        contentId: "new-content",
        text: "Second section\n\nMore text.",
        embedding: [0.3, 0.4],
      },
    ]);
  });

  it("reports not ingested when a concurrent insert wins the URL conflict", async () => {
    mockExistingContent(undefined);
    const transaction = mockTransaction(undefined);
    vi.mocked(fetch).mockResolvedValue(new Response(articleHtml));

    await expect(ingestArticle(article)).resolves.toEqual({ ingested: false });

    expect(transaction.chunkValues).not.toHaveBeenCalled();
  });
});
