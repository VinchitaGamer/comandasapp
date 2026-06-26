import { useStore } from "@/store";
import { LogOut, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useStore();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[rgba(13,17,23,0.8)] backdrop-blur-2xl backdrop-saturate-[180%] px-6 h-16 flex items-center justify-between font-sans">
      <div className="flex items-center gap-3">
        <span className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Sour</span><span className="text-[var(--text-primary)]">Das</span>
        </span>
        <span className="hidden sm:block h-5 w-px bg-[var(--border-default)] mx-1"></span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-widest text-[var(--text-muted)] uppercase bg-[var(--surface)] border border-[var(--border-default)] px-3 py-1 rounded-full">
          {user?.role === "ADMIN" ? "Administración" : user?.role === "MESERO" ? "Mesero / Salón" : "Cocina"}
        </span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-muted)] border border-emerald-500/20">
              <UserIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-semibold hidden sm:inline-block">{user.username}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline-block">Cerrar Sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}
