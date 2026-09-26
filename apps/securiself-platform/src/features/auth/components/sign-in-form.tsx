"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthCard } from "./auth-card";
import { GoogleSignInButton } from "./google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { useLogin } from "../hooks";
import { signInSchema, type SignInValues } from "../schemas";

export function SignInForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const login = useLogin(returnTo);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: SignInValues) => {
    login.mutate(values, {
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Unable to sign in",
        );
      },
    });
  };

  const signUpHref = returnTo
    ? `${routes.signUp}?returnTo=${encodeURIComponent(returnTo)}`
    : routes.signUp;

  return (
    <AuthCard
      title="Sign in"
      description="Access your SecuriSelf console."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={signUpHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password ? (
            <p
              id="password-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <GoogleSignInButton returnTo={returnTo} text="signin_with" />
    </AuthCard>
  );
}
