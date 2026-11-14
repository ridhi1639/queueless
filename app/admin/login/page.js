"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        router.push("/admin");
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then log in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/admin");
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-indigo-600">QueueLess Admin</h1>
        <p className="text-gray-600">
          {mode === "login" ? "Log in to your account" : "Create your admin account"}
        </p>

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        />

        {message && <p className="text-sm text-red-600">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="w-full text-sm text-indigo-600"
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
      </form>
    </main>
  );
}