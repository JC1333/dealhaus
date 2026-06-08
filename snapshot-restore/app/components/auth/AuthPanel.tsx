type AuthPanelProps = {
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  fullName: string
  setFullName: (value: string) => void
  authMode: "login" | "signup"
  setAuthMode: (value: "login" | "signup") => void
  onSubmit: () => void
}

export default function AuthPanel({
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  authMode,
  setAuthMode,
  onSubmit,
}: AuthPanelProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold mb-2">DealHaus AI</h1>

        <p className="text-zinc-400 mb-8">
          AI-powered arbitrage marketplace command center.
        </p>

        <div className="space-y-4">
          {authMode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
          />

          <button
            onClick={onSubmit}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black hover:bg-cyan-300 transition"
          >
            {authMode === "login" ? "Log In" : "Create Account"}
          </button>
        </div>

        <button
          onClick={() =>
            setAuthMode(authMode === "login" ? "signup" : "login")
          }
          className="mt-6 text-sm text-zinc-400 hover:text-white"
        >
          {authMode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  )
}