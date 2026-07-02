import { logout } from "@/actions/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({ label }: { label?: string }) {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="ghost"
        size={label ? "default" : "icon"}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Sair"
      >
        <LogOut className="size-4" />
        {label && <span>{label}</span>}
      </Button>
    </form>
  );
}
