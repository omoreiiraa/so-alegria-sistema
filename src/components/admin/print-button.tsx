"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="bg-verde text-white hover:bg-verde-escuro font-semibold shadow-sm cursor-pointer"
    >
      <Printer className="size-4 mr-1.5" />
      Imprimir
    </Button>
  );
}
