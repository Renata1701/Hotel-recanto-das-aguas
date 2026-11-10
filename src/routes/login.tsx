import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, Waves } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import hero from "@/assets/hero-pool.jpg";
import { authenticate, getStaffSession, resolvePostLoginPath, setStaffSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    const session = getStaffSession();
    if (session) {
      throw redirect({ to: resolvePostLoginPath(search.redirect, session) });
    }
  },
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Área de Acesso · Recanto das Águas" },
      { name: "description", content: "Acesso da equipe ao sistema de comanda digital." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const session = authenticate(login, password);
    if (!session) {
      setError("Credenciais inválidas. Verifique e-mail/usuário e senha.");
      setLoading(false);
      return;
    }
    setStaffSession(session);
    void navigate({ to: resolvePostLoginPath(redirect, session) });
  };

  return (
    <div className="login-resort flex min-h-screen flex-col lg:flex-row">
      <aside className="relative hidden min-h-screen w-full overflow-hidden lg:flex lg:w-[58%]">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="login-resort-hero-overlay absolute inset-0" aria-hidden />
        <div className="relative z-10 flex h-full flex-col justify-end p-12 xl:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Recanto das Águas</p>
          <h2 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.75rem]">
            Bem-vindo ao Paraíso
          </h2>
          <p className="mt-4 max-w-md text-lg font-medium text-white/90">Acesse seu refúgio digital</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 items-center justify-center bg-[#ffffff] px-5 py-12 sm:px-10 lg:w-[42%] lg:bg-[var(--login-surface)]">
        <div className="w-full max-w-[24.5rem]">
          <div className="login-resort-card rounded-2xl p-8 sm:p-9">
            <header className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-md">
                <Waves className="size-7" aria-hidden />
              </div>
              <p className="mt-5 text-lg font-semibold tracking-tight text-[var(--login-ink)]">Recanto das Águas</p>
            </header>

            <div className="mt-8">
              <h1 className="text-center text-xl font-semibold text-[var(--login-ink)]">Área de Acesso</h1>
              <p className="mt-2 text-center text-sm text-[var(--login-muted)]">
                Entre com e-mail ou usuário da equipe e sua senha.
              </p>

              <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
                <div className="space-y-2">
                  <label htmlFor="login" className="text-sm font-medium text-[var(--login-ink)]">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 size-[1.125rem] -translate-y-1/2 text-[var(--login-muted)]"
                      aria-hidden
                    />
                    <input
                      id="login"
                      name="login"
                      type="text"
                      autoComplete="username"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="nome@recanto.com ou usuário"
                      className="login-resort-input w-full pr-3"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--login-ink)]">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 size-[1.125rem] -translate-y-1/2 text-[var(--login-muted)]"
                      aria-hidden
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="login-resort-input w-full pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--login-muted)] transition-colors hover:bg-[var(--login-focus)] hover:text-[var(--login-primary)]"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className={cn("login-resort-btn w-full")}>
                  {loading ? "Entrando…" : "Acessar"}
                </button>
              </form>

              <footer className="mt-6 flex flex-col items-center gap-3 text-sm">
                <button
                  type="button"
                  className="text-[var(--login-muted)] transition-colors hover:text-[var(--login-primary)]"
                  onClick={() => toast.message("Solicite a redefinição de senha à recepção ou ao administrador.")}
                >
                  Esqueceu a senha?
                </button>
                <Link
                  to="/acesso"
                  search={{ codigo: "RDA-R4F4-208A" }}
                  className="text-[var(--login-muted)] transition-colors hover:text-[var(--login-primary)]"
                >
                  Acessar via QR Code
                </Link>
                <Link
                  to="/cliente/entrar"
                  className="text-xs text-[var(--login-muted)]/80 transition-colors hover:text-[var(--login-primary)]"
                >
                  Área do hóspede
                </Link>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
