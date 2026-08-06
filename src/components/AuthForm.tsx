"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  loginAction,
  registerAction,
  type AuthState,
} from "@/app/actions/auth";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          className="field-input"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field-input"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-300">{state.error}</p>
      ) : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-[var(--fog)]">
        New here?{" "}
        <Link href="/register" className="text-[var(--foul)] underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="displayName">
          Display name
        </label>
        <input id="displayName" name="displayName" className="field-input" required />
      </div>
      <div>
        <label className="field-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          className="field-input"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field-input"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-300">{state.error}</p>
      ) : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Join the club"}
      </button>
      <p className="text-center text-sm text-[var(--fog)]">
        Already a member?{" "}
        <Link href="/login" className="text-[var(--foul)] underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
