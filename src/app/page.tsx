"use client";

import { useState } from "react";
import Image from "next/image";

import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGitHub() {
    setError(null);
    setIsAuthenticating(true);

    const result = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to start GitHub sign-in.");
      setIsAuthenticating(false);
    }
  }

  async function signOut() {
    setError(null);
    setIsAuthenticating(true);

    const result = await authClient.signOut();

    if (result.error) {
      setError(result.error.message ?? "Unable to sign out.");
    }

    setIsAuthenticating(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-5 py-10 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.11),transparent_34rem)]" />
      <section className="relative w-full max-w-[390px] border border-white/[0.09] bg-white/[0.035] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="auth-enter auth-enter-delay-1 flex items-center gap-2 text-sm font-medium tracking-[-0.01em] text-zinc-100">
          <span className="grid size-5 place-items-center rounded-sm bg-zinc-100 text-[10px] font-black text-black">V</span>
          video-blog-suggester
        </div>

        <div className="auth-enter auth-enter-delay-2 mt-16">
          {isPending ? (
            <div className="space-y-3" aria-live="polite">
              <div className="h-7 w-36 animate-pulse bg-white/[0.09]" />
              <div className="h-4 w-56 animate-pulse bg-white/[0.05]" />
            </div>
          ) : session ? (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Signed in as</p>
              <div className="mt-5 flex items-center gap-4">
                {session.user.image ? (
                  <Image
                    alt={`${session.user.name ?? "User"}'s profile`}
                    className="size-14 rounded-full outline outline-1 outline-white/15 outline-offset-2"
                    height={56}
                    src={session.user.image}
                    width={56}
                  />
                ) : (
                  <div className="grid size-14 place-items-center rounded-full bg-white/[0.08] text-lg font-semibold text-zinc-300">
                    {session.user.name?.slice(0, 1).toUpperCase() ?? "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-[-0.04em] text-zinc-50">
                    {session.user.name ?? "GitHub user"}
                  </h1>
                  <p className="mt-1 truncate text-sm text-zinc-500">{session.user.email}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Authentication</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-zinc-50">Welcome back.</h1>
              <p className="mt-3 max-w-[30ch] text-sm leading-6 text-zinc-400">
                Sign in with GitHub to continue to your workspace.
              </p>
            </>
          )}
        </div>

        <div className="auth-enter auth-enter-delay-3 mt-10 min-h-11">
          {session ? (
            <button
              className="flex h-11 w-full items-center justify-center border border-white/[0.14] bg-transparent px-4 text-sm font-medium text-zinc-200 transition-[background-color,border-color,transform] duration-150 ease-out hover:border-white/30 hover:bg-white/[0.07] active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
              disabled={isAuthenticating}
              onClick={signOut}
              type="button"
            >
              {isAuthenticating ? "Signing out…" : "Sign out"}
            </button>
          ) : (
            <button
              className="flex h-11 w-full items-center justify-center gap-2 bg-zinc-100 px-4 text-sm font-medium text-zinc-950 transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              disabled={isAuthenticating || isPending}
              onClick={signInWithGitHub}
              type="button"
            >
              <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.49c-2.23.49-2.7-.95-2.7-.95-.36-.93-.89-1.18-.89-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.67.07-.51.28-.87.51-1.07-1.78-.2-3.65-.88-3.65-3.96 0-.88.32-1.6.83-2.16-.08-.2-.36-1.02.08-2.13 0 0 .68-.21 2.2.82A7.7 7.7 0 0 1 8 3.87c.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.52.56.83 1.28.83 2.16 0 3.09-1.87 3.75-3.66 3.95.29.25.54.72.54 1.45v2.15c0 .21.14.46.55.38A8 8 0 0 0 8 0Z" />
              </svg>
              {isAuthenticating ? "Redirecting…" : "Continue with GitHub"}
            </button>
          )}
          {error ? <p className="mt-3 text-sm text-red-300" role="alert">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
