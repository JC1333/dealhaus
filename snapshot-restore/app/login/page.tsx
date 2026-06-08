'use client'

import { useState } from 'react'

export default function LoginPage() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (

    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8">

        <h1 className="text-4xl font-bold mb-3">
          DealHaus Login
        </h1>

        <p className="text-zinc-400 mb-8">
          Access the AI brokerage operating system
        </p>

        <div className="space-y-5">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-2xl px-5 py-4 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-2xl px-5 py-4 outline-none"
          />

          <button className="w-full bg-cyan-500 hover:bg-cyan-400 transition text-black font-bold py-4 rounded-2xl">

            Sign In

          </button>

        </div>

      </div>

    </div>

  )

}