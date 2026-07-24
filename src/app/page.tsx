"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { searchContent, type SearchResult } from "@/app/actions/search";
import { authClient } from "@/lib/auth/auth-client";

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
      <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function formatSimilarity(similarity: number) {
  return `${Math.round(Math.max(0, Math.min(1, similarity)) * 100)}%`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


function encodeTextFragment(text: string) {
  // Text Fragment 将连字符用作前后文分隔符，但 encodeURIComponent 不会编码它。
  return encodeURIComponent(text).replace(/-/g, "%2D");
}

function getUrlAtChunkLocation(result: SearchResult) {
  const type = result.type

  switch (type) {
    case "article":
      const splitTexts = result.rawText.split('\n')
      console.log(splitTexts)
      return `${result.url}#:~:text=${encodeTextFragment(splitTexts[0])}`
     

    case 'video':
      return result.url

    default:
      throw new Error(`Unsupported type ${type satisfies never}`)
  }
}


export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isLoggedIn = Boolean(session);

  async function signInWithGitHub() {
    setIsAuthenticating(true);
    const result = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
    if (result.error) setIsAuthenticating(false);
  }

  async function signOut() {
    setIsAuthenticating(true);
    await authClient.signOut();
    setIsAuthenticating(false);
    setQuery("");
    setResults(null);
    setSearchError(null);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    if (!search || !isLoggedIn || isSearching) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      setResults(await searchContent(search));
    } catch {
      setSearchError("搜索失败，请稍后重试。");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white" href="#search">
        跳到搜索
      </a>

      <header className="border-b border-black/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link className="flex min-h-10 items-center gap-2.5 font-semibold tracking-[-0.02em]" href="/">
            <span className="grid size-6 place-items-center rounded-[5px] bg-black text-[11px] font-bold text-white">B</span>
            <span className="text-sm">Blog Search</span>
          </Link>

          {isPending ? (
            <div aria-label="正在加载用户信息" className="h-9 w-24 animate-pulse rounded-md bg-black/5" />
          ) : session ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2" title={session.user.email ?? undefined}>
                {session.user.image ? (
                  <Image alt="" className="size-7 rounded-full object-cover" height={28} src={session.user.image} width={28} />
                ) : (
                  <span className="grid size-7 place-items-center rounded-full bg-black text-[11px] font-medium text-white">
                    {session.user.name?.slice(0, 1).toUpperCase() ?? "U"}
                  </span>
                )}
                <span className="hidden max-w-36 truncate text-sm text-black/70 sm:block">
                  {session.user.name ?? "用户"}
                </span>
              </div>
              <button
                className="min-h-10 rounded-md px-3 text-sm text-black/60 transition-[background-color,color,transform] duration-150 hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isAuthenticating}
                onClick={signOut}
                type="button"
              >
                {isAuthenticating ? "退出中" : "退出"}
              </button>
            </div>
          ) : (
            <button
              className="min-h-10 rounded-md bg-black px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isAuthenticating}
              onClick={signInWithGitHub}
              type="button"
            >
              {isAuthenticating ? "跳转中" : "登录"}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <section className={results === null ? "pb-20 pt-[18vh] sm:pt-[22vh]" : "pb-10 pt-14 sm:pt-20"} id="search">
          <div className={results === null ? "text-center" : "text-left"}>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-black/45">Blog index</p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.022em] sm:text-5xl">
              搜索博客
            </h1>
            <p className="mt-4 text-pretty text-[15px] leading-7 text-black/55">
              输入标题、主题或一段内容，查找相关内容。
            </p>
          </div>

          <form className={results === null ? "mt-10" : "mt-8"} onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="blog-query">搜索博客</label>
            <div className="flex min-h-14 items-center rounded-lg border border-black/15 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-black focus-within:ring-1 focus-within:ring-black">
              <div className="flex min-w-0 flex-1 items-center gap-3 pl-3 text-black/45">
                <SearchIcon />
                <input
                  autoFocus
                  className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-black outline-none placeholder:text-black/35 disabled:cursor-not-allowed disabled:text-black/30"
                  disabled={!isLoggedIn || isPending || isSearching}
                  id="blog-query"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isPending ? "正在确认登录状态" : isLoggedIn ? "搜索标题、主题或内容" : "登录后即可搜索"}
                  value={query}
                />
              </div>
              <button
                aria-label="搜索"
                className="grid size-11 shrink-0 place-items-center rounded-md bg-black text-white transition-[background-color,transform] duration-150 hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30"
                disabled={!isLoggedIn || isSearching || !query.trim()}
                type="submit"
              >
                {isSearching ? (
                  <span aria-label="正在搜索" className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ArrowIcon />
                )}
              </button>
            </div>

            {!isPending && !isLoggedIn && (
              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <p className="text-sm leading-6 text-black/50">必须先登录才能进行搜索。</p>
                <button
                  className="min-h-10 rounded-md bg-black px-5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isAuthenticating}
                  onClick={signInWithGitHub}
                  type="button"
                >
                  {isAuthenticating ? "跳转中" : "使用 GitHub 登录"}
                </button>
              </div>
            )}

            {searchError && (
              <p className="mt-4 text-center text-sm text-red-600" role="alert">{searchError}</p>
            )}
          </form>
        </section>

        {results !== null && (
          <section aria-live="polite" className="border-t border-black/10 pb-20">
            <div className="flex items-center justify-between py-5 text-sm text-black/50">
              <span>搜索结果</span>
              <span className="font-mono text-xs tabular-nums">{results.length} 条</span>
            </div>

            {results.length === 0 ? (
              <div className="border-t border-black/10 py-16 text-center">
                <p className="font-medium">没有找到相关内容</p>
                <p className="mt-2 text-sm leading-6 text-black/50">换一个关键词，或输入更完整的主题。</p>
              </div>
            ) : (
              <ul className="border-t border-black/10">
                {results.map((item, index) => (
                  <li className="border-b border-black/10" key={`${item.url}-${index}`}>
                    <a
                      className="group flex gap-4 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:gap-6"
                      href={getUrlAtChunkLocation(item)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <div className="relative h-18 w-24 shrink-0 overflow-hidden rounded-md bg-black/5  outline-1 -outline-offset-1 outline-black/10 sm:h-20 sm:w-28">
                        <Image
                          alt=""
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          fill
                          sizes="(min-width: 640px) 112px, 96px"
                          src={item.thumbnailUrl}
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-balance text-lg font-medium tracking-[-0.012em] transition-colors duration-150 group-hover:text-black/60">
                          {item.title}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-pretty text-sm leading-6 text-black/50">
                          {item.description}
                        </p>
                        <div className="mt-3 flex items-center gap-3 font-mono text-xs text-black/40 tabular-nums">
                          <span>{formatSimilarity(item.similarity)}</span>
                          <span>{formatDate(item.publishDate)}</span>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
