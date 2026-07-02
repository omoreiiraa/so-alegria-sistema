"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdminNav } from "@/components/admin/admin-nav";
import { Wordmark } from "@/components/brand/wordmark";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Menu"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
        <SheetHeader>
          <SheetTitle>
            <Wordmark className="text-lg text-sidebar-foreground" subtitle={false} />
          </SheetTitle>
        </SheetHeader>
        <div className="px-3">
          <AdminNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
