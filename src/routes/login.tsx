import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LogIn, Waves } from "lucide-react";
import { useState, type FormEvent } from "react";
import hero from "@/assets/hero-pool.jpg";
import { authenticate, getStaffSession, resolvePostLoginPath, setStaffSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      { title: "Entrar · Recanto das Águas" },
      { name: "description", content: "Acesso da equipe ao sistema de comanda digital." },
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
      setError("Usuário ou senha inválidos.");
      setLoading(false);
      return;
    }
    setStaffSession(session);
    void navigate({ to: resolvePostLoginPath(redirect, session) });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden min-h-screen w-[min(48vw,640px)] shrink-0 lg:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative flex h-full flex-col justify-end p-10 text-primary-foreground">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/80">Hotel Recanto das Águas</p>
          <p className="mt-3 max-w-sm font-display text-3xl font-semibold leading-tight">Consumo digital com conferência do hóspede.</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8 lg:justify-center lg:py-10">
        <p className="sr-only">Login</p>
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border bg-card shadow-soft">
            <div className="flex items-center gap-2.5 border-b px-5 py-4 sm:px-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-gradient text-primary-foreground shadow-soft">
                <Waves className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold leading-tight sm:text-xl">Recanto das Águas</span>
                <span className="block text-xs text-muted-foreground sm:text-sm">RF01 — funcionários e perfis</span>
              </span>
            </div>

            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <h1 className="font-display text-xl font-semibold sm:text-2xl">Entrar</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Use suas credenciais para acessar atendimento, terminal ou recepção.
              </p>

            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="login">Usuário</Label>
                <Input
                  id="login"
                  name="login"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Seu usuário"
                  className="h-11 bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    className="h-11 bg-background pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-11 w-full gap-2 text-base" disabled={loading}>
                <LogIn className="size-4" />
                {loading ? "Entrando…" : "Acessar"}
              </Button>
            </form>
            </div>

            <p className="border-t px-5 py-3 text-center text-sm text-muted-foreground sm:px-6">              Área do hóspede?{" "}
              <Link to="/cliente/entrar" className="font-medium text-primary hover:underline">
                Acessar como hóspede
              </Link>
              {" · "}
              <Link to="/cliente/cadastro" className="font-medium text-primary hover:underline">
                Cadastro fictício
              </Link>
              {" · "}
              <Link to="/acesso" search={{ codigo: "RDA-R4F4-208A" }} className="font-medium text-primary hover:underline">
                Link de acesso (QR)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
