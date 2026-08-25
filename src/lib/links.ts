import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { LinkTipo } from "@/types/domain";

/** Validade do convite de festa. O colaborador responde ou o admin gera outro. */
export const CONVITE_TTL_HORAS = 24;

/**
 * Token de 256 bits em base64url. O valor em claro só existe no retorno desta
 * função — no banco guardamos apenas o hash, então nem um vazamento do dump
 * devolve links utilizáveis.
 */
export function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function urlDoLink(tipo: LinkTipo, token: string): string {
  return `${baseUrl()}/${tipo === "cadastro" ? "cadastro" : "convite"}/${token}`;
}

export function expiraEmDoConvite(): string {
  return new Date(Date.now() + CONVITE_TTL_HORAS * 60 * 60 * 1000).toISOString();
}
