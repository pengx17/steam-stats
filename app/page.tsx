"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import LoginButton from "./components/LoginButton";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 relative overflow-hidden selection:bg-orange-100">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Background decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Large gradient blobs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-200/60 via-rose-200/40 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-200/50 via-indigo-200/30 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-amber-100/30 via-transparent to-rose-100/30 blur-3xl" />
        
        {/* Floating geometric shapes */}
        <div className="absolute top-[15%] left-[10%] w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400/20 to-rose-400/20 rotate-12 animate-float" />
        <div className="absolute top-[25%] right-[15%] w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-[20%] left-[20%] w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 -rotate-12 animate-float" style={{ animationDelay: '-4s' }} />
        <div className="absolute bottom-[30%] right-[10%] w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-400/15 to-purple-400/15 rotate-6 animate-float" style={{ animationDelay: '-1s' }} />
        <div className="absolute top-[60%] left-[8%] w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rotate-45 animate-float" style={{ animationDelay: '-3s' }} />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Decorative circles */}
        <div className="absolute top-[10%] right-[25%] w-3 h-3 rounded-full bg-orange-400/40" />
        <div className="absolute top-[45%] left-[5%] w-2 h-2 rounded-full bg-blue-400/40" />
        <div className="absolute bottom-[15%] right-[30%] w-4 h-4 rounded-full bg-rose-400/30" />
        <div className="absolute top-[70%] right-[8%] w-2 h-2 rounded-full bg-emerald-400/40" />
        <div className="absolute bottom-[40%] left-[30%] w-3 h-3 rounded-full bg-violet-400/30" />
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-2xl mx-auto text-center space-y-10">
          
          {/* Logo */}
          <div className="inline-flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl blur-lg opacity-40" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            <span className="text-2xl font-bold text-neutral-900 tracking-tight">Steam Stats</span>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 tracking-tight leading-tight">
              探索你的
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500">
                游戏人生
              </span>
            </h1>
            
            <p className="text-lg text-neutral-500 max-w-md mx-auto">
              追踪游戏时长，探索游戏库，发现你的玩家画像
            </p>
          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200/50 text-sm font-medium text-neutral-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              游戏时长追踪
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200/50 text-sm font-medium text-neutral-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              AI 玩家画像
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200/50 text-sm font-medium text-neutral-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              价值分析
            </span>
          </div>

          {/* CTA Button */}
          <div>
            <LoginButton />
          </div>

          {/* Preview stats */}
          <div className="pt-4 flex items-center justify-center gap-8 sm:gap-12 text-sm text-neutral-400">
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900 font-mono">5,643</div>
              <div className="mt-1">小时游戏</div>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900 font-mono">226</div>
              <div className="mt-1">游戏收藏</div>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500 font-mono">INTJ</div>
              <div className="mt-1">玩家类型</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
