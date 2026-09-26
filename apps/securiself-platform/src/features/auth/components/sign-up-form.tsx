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
import { useRegister } from "../hooks";
import { signUpSchema, type SignUpValues } from "../schemas";

export function SignUpForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const registerUser = useRegister(returnTo);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      legalFirstName: "",
      legalLastName: "",
    },
  });

  const onSubmit = (values: SignUpValues) => {
    registerUser.mutate(
      {
        email: values.email,
        password: values.password,
        legalFirstName: values.legalFirstName || undefined,
        legalLastName: values.legalLastName || undefined,
      },
      {
        onError: (error) => {
          toast.error(
            error instanceof ApiError ? error.message : "Unable to sign up",
          );
        },
      },
    );
  };

  const signInHref = returnTo
    ? `${routes.signIn}?returnTo=${encodeURIComponent(returnTo)}`
    : routes.signIn;

  return (
    <AuthCard
      title="Create account"
      description="Set up your SecuriSelf root identity."
      footer={
        <>
          Already have an account?{" "}
          <Link href={signInHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalFirstName">
              Legal first name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="legalFirstName"
              autoComplete="given-name"
              {...register("legalFirstName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legalLastName">
              Legal last name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="legalLastName"
              autoComplete="family-name"
              {...register("legalLastName")}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={registerUser.isPending}
        >
          {registerUser.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <GoogleSignInButton returnTo={returnTo} text="signup_with" />
    </AuthCard>
  );
}
