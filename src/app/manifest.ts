import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Só Alegria — Recreação e Discoteca",
    short_name: "Só Alegria",
    description:
      "Escala, confirmação de festas, disponibilidade e pagamentos da equipe Só Alegria.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF9F0",
    theme_color: "#1FA24C",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
