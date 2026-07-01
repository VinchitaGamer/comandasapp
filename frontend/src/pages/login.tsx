import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useStore, User } from "@/store";
import api from "@/services/api";
import { Lock, User as UserIcon, AlertCircle } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const { login, token, user } = useStore();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (token && user) {
      if (user.role === "ADMIN") router.push("/admin");
      else if (user.role === "MESERO") router.push("/mesero");
      else if (user.role === "COCINA") router.push("/cocina");
    }
  }, [token, user, router]);

  // Auto-login for demo purposes
  useEffect(() => {
    if (!router.isReady) return;
    
    const demoRole = router.query.demo;
    if (!demoRole) return;

    let demoUser = "";
    let demoPass = "";

    if (demoRole === "admin") {
      demoUser = "admin";
      demoPass = "admin123";
    } else if (demoRole === "mesero") {
      demoUser = "mesero1";
      demoPass = "mesero123";
    } else if (demoRole === "cocina") {
      demoUser = "cocina1";
      demoPass = "cocina123";
    }

    if (demoUser && demoPass) {
      const performAutoLogin = async () => {
        setLoading(true);
        setError("");
        try {
          const params = new URLSearchParams();
          params.append("username", demoUser);
          params.append("password", demoPass);

          const res = await api.post("/auth/login", params, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });

          const { access_token, role, username: resUsername } = res.data;
          
          const profileRes = await api.get("/auth/me", {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const loggedInUser: User = {
            id: profileRes.data.id,
            username: resUsername,
            role: role as "ADMIN" | "MESERO" | "COCINA",
          };

          login(loggedInUser, access_token);
        } catch (err: any) {
          console.error("Auto-login error:", err);
          setError("Error en el inicio de sesión automático de la demo");
        } finally {
          setLoading(false);
        }
      };
      
      performAutoLogin();
    }
  }, [router.isReady, router.query, login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Por favor, complete todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use URLSearchParams since backend OAuth2PasswordRequestForm expects form-urlencoded data
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const res = await api.post("/auth/login", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, role, username: resUsername } = res.data;
      
      // Fetch user profile detail
      const profileRes = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const loggedInUser: User = {
        id: profileRes.data.id,
        username: resUsername,
        role: role as "ADMIN" | "MESERO" | "COCINA",
      };

      login(loggedInUser, access_token);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Error de conexión con el servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-[var(--surface-dim)] overflow-hidden font-sans">
      {/* Background ambient glow circles — emerald */}
      <div className="absolute top-1/4 left-1/4 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/8 blur-[140px]"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-600/6 blur-[120px]"></div>

      <div className="w-full max-w-md px-6 z-10 animate-slide-up">
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)]/60 p-8 shadow-[var(--shadow-4)] backdrop-blur-xl transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Sour</span>Das
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Sistema de Gestión de Comandas</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 animate-shake">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <UserIcon className="h-4 w-4 text-[var(--text-disabled)]" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, mesero1, cocina1..."
                  className="block w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] transition-all duration-200 focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--text-disabled)]" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] transition-all duration-200 focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3.5 text-sm font-bold text-[var(--primary-on)] shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary-on)] border-t-transparent"></span>
                  Autenticando...
                </span>
              ) : (
                "Ingresar al Sistema"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
