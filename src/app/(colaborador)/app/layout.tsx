import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { BottomTabBar } from "@/components/colaborador/bottom-tab-bar";
import { BrandBadge, Wordmark } from "@/components/brand/wordmark";
import { LogoutButton } from "@/components/common/logout-button";

export default async function ColaboradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { profile } = session;

  return (
    <div className="theme-app flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BrandBadge className="size-8" />
            <Wordmark className="text-base" subtitle={false} />
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">{children}</main>

      {profile.aprovado && <BottomTabBar />}
    </div>
  );
}
