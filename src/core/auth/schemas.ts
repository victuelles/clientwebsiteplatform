import { z } from "zod";

// Shared by the auth forms (client-side validation) and their server actions (re-validation).

export const emailSchema = z.email("Enter a valid email address.").trim().toLowerCase();

/** Mirrors the Supabase Auth password policy (min 10, lower + upper + digit). */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(100, "Use at most 100 characters.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const magicLinkSchema = z.object({ email: emailSchema });

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({ fullName: fullNameSchema });

export type SignInValues = z.infer<typeof signInSchema>;
export type MagicLinkValues = z.infer<typeof magicLinkSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;

/** Result of the public auth form actions (sign-in, sign-up, password reset). */
export type AuthFormResult = { ok: true; message?: string } | { ok: false; error: string };
