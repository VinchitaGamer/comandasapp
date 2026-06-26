import { useEffect } from "react";
import { useRouter } from "next/router";
import { useStore } from "@/store";

export default function Home() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!token || !user) {
      router.replace("/login");
      return;
    }

    // Redirect based on user role
    if (user.role === "ADMIN") {
      router.replace("/admin");
    } else if (user.role === "MESERO") {
      router.replace("/mesero");
    } else if (user.role === "COCINA") {
      router.replace("/cocina");
    } else {
      router.replace("/login");
    }
  }, [user, token, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        <p className="text-sm font-medium tracking-wide">Cargando Sistema de Comandas...</p>
      </div>
    </div>
  );
}
