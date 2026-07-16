import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Só Alegria — Gestão de Recreação",
    template: "%s · Só Alegria",
  },
  description:
    "Plataforma da Só Alegria para escala, confirmação de festas, disponibilidade e pagamentos dos recreadores.",
  applicationName: "Só Alegria",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Só Alegria", statusBarStyle: "default" },
  icons: { icon: "/soalegria.jpg", apple: "/soalegria.jpg" },
  openGraph: {
    title: "Só Alegria — Gestão de Recreação",
    description:
      "Plataforma da Só Alegria para escala, confirmação de festas, disponibilidade e pagamentos dos recreadores.",
    images: [
      {
        url: "/soalegria.jpg",
        width: 800,
        height: 600,
        alt: "Logo Só Alegria",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1FA24C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${figtree.variable} ${baloo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
