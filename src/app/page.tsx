"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { authClient } from "@/lib/auth/auth-client";

const examples = [
  "如何建立个人知识管理系统",
  "2026 年 AI 产品设计趋势",
  "深度工作：如何避免注意力分散",
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0 text-[#78908c]" fill="none" viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="6.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  async function signInWithGitHub() {
    setIsAuthenticating(true);
    const result = await authClient.signIn.social({ provider: "github", callbackURL: "/" });
    if (result.error) setIsAuthenticating(false);
  }

  async function signOut() {
    setIsAuthenticating(true);
    await authClient.signOut();
    setIsAuthenticating(false);
  }

  function searchYouTube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    if (!search) return;
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(search)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f6] text-[#163238]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between">
          <Link className="flex items-center gap-2.5 font-semibold tracking-[-0.04em]" href="/">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#163238] text-[13px] font-bold text-[#e9fff6]">▶</span>
            <span className="text-[15px]">Blog to Video</span>
          </Link>
          {isPending ? (
            <div className="h-8 w-16 animate-pulse rounded-full bg-[#e7ece8]" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5" title={session.user.email ?? undefined}>
                {session.user.image ? (
                  <Image alt="" className="size-8 rounded-full object-cover ring-2 ring-white" height={32} src={session.user.image} width={32} />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-[#cce9dd] text-xs font-semibold text-[#24554e]">
                    {session.user.name?.slice(0, 1).toUpperCase() ?? "U"}
                  </span>
                )}
                <span className="hidden max-w-28 truncate text-sm font-medium text-[#36545a] sm:inline">
                  {session.user.name ?? "用户"}
                </span>
              </div>
              <button className="text-xs text-[#81938f] transition-colors hover:text-[#163238] disabled:opacity-60" disabled={isAuthenticating} onClick={signOut} type="button">
                {isAuthenticating ? "退出中…" : "退出"}
              </button>
            </div>
          ) : (
            <button className="rounded-full border border-[#d7e0da] bg-white px-4 py-2 text-sm font-medium text-[#36545a] shadow-[0_1px_1px_rgba(22,50,56,.04)] transition hover:border-[#9abcb3] hover:text-[#163238] disabled:opacity-60" disabled={isAuthenticating} onClick={signInWithGitHub} type="button">
              {isAuthenticating ? "跳转中…" : "登录"}
            </button>
          )}
        </header>

        <section className="relative flex flex-1 flex-col items-center justify-center pb-20 pt-14 sm:pb-28">
          <div className="absolute left-1/2 top-[24%] -z-0 h-[26rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(167,226,207,.48),rgba(247,248,246,0)_67%)] blur-2xl" />
          <div className="relative z-10 w-full max-w-3xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dbe7e0] bg-[#fbfdfb]/80 px-3 py-1.5 text-xs font-medium text-[#54716e] backdrop-blur">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#47b78f] opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-[#47b78f]" /></span>
              为每篇好文章，找到值得看的视频
            </div>
            <h1 className="text-balance text-[clamp(2.75rem,8vw,5.65rem)] font-semibold leading-[.98] tracking-[-0.075em] text-[#163238]">
              从博客出发，<br />去 YouTube 深潜。
            </h1>
            <p className="mx-auto mt-6 max-w-md text-pretty text-[15px] leading-7 text-[#61777b] sm:text-base">
              粘贴文章标题、主题或一段内容，我们会把它变成更准确的视频搜索。
            </p>

            <form className="mx-auto mt-10 max-w-2xl" onSubmit={searchYouTube}>
              <label className="sr-only" htmlFor="blog-query">博客主题或内容</label>
              <div className="group flex rounded-[22px] border border-[#cedbd4] bg-white p-2 shadow-[0_18px_45px_rgba(29,74,65,.09),0_2px_5px_rgba(29,74,65,.04)] transition-all focus-within:border-[#74b9a4] focus-within:shadow-[0_20px_50px_rgba(29,74,65,.13),0_0_0_4px_rgba(113,190,166,.13)]">
                <div className="flex min-w-0 flex-1 items-center gap-3 pl-3 sm:pl-4">
                  <SearchIcon />
                  <input autoFocus className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-[#163238] outline-none placeholder:text-[#91a19e]" id="blog-query" onChange={(event) => setQuery(event.target.value)} placeholder="输入博客主题、标题或一段文字…" value={query} />
                </div>
                <button className="flex h-12 shrink-0 items-center gap-2 rounded-[15px] bg-[#163238] px-4 text-sm font-medium text-white transition hover:bg-[#245058] active:scale-[.98] sm:px-5" type="submit">
                  <span className="hidden sm:inline">搜索视频</span>
                  <ArrowIcon />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs text-[#7b8f8d]">
                <span>试试：</span>
                {examples.map((example) => (
                  <button className="rounded-full border border-transparent px-2.5 py-1 text-[#55756f] transition hover:border-[#cfe1d9] hover:bg-white hover:text-[#1e4c49]" key={example} onClick={() => setQuery(example)} type="button">
                    {example}
                  </button>
                ))}
              </div>
            </form>
          </div>

          <div aria-hidden="true" className="relative z-10 mt-16 flex h-12 w-full max-w-xl items-center justify-center gap-1.5 opacity-75 sm:mt-20">
            {[15, 25, 40, 20, 54, 30, 70, 45, 25, 62, 35, 18, 48, 29, 58, 22, 38, 16, 32].map((height, index) => (
              <span className="w-1 rounded-full bg-[#77c4ad]" key={index} style={{ height }} />
            ))}
          </div>
        </section>

        <footer className="flex items-center justify-between text-xs text-[#8b9b98]">
          <span>用文字发现影像</span>
          <span>打开 YouTube 搜索结果</span>
        </footer>
      </div>
    </main>
  );
}
