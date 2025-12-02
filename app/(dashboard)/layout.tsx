"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "../components/LoginButton";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { GamesProvider } from "../components/GamesProvider";
import { Loader2, LayoutDashboard, List, PieChart, Skull, Gamepad2, DollarSign, Clock, Brain, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const navItemsConfig = [
  { href: "/dashboard", labelKey: "overview" as const, icon: LayoutDashboard },
  { href: "/library", labelKey: "library" as const, icon: List },
  { href: "/reviews", labelKey: "reviews" as const, icon: MessageSquare },
  { href: "/timeline", labelKey: "timeline" as const, icon: Clock },
  { href: "/value", labelKey: "value" as const, icon: DollarSign },
  { href: "/charts", labelKey: "charts" as const, icon: PieChart },
  { href: "/personality", labelKey: "personality" as const, icon: Brain },
  { href: "/shame", labelKey: "shame" as const, icon: Skull },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { t } = useI18n();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="hidden sm:inline bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Steam Stats
              </span>
            </Link>

            {/* Nav Links */}
            <nav className="flex items-center gap-1">
              {navItemsConfig.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const label = t.nav[item.labelKey];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info & Language Switcher */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <LoginButton />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pb-12">
        <GamesProvider>
          {children}
        </GamesProvider>
      </main>
    </div>
  );
}
