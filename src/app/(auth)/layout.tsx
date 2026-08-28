import Link from "next/link";
import { Wordmark, BrandBadge } from "@/components/brand/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-app flex min-h-dvh flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3">
          <BrandBadge className="size-14" />
          <Wordmark className="text-2xl" />
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
