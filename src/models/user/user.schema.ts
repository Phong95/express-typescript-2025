import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import z from "zod";
extendZodWithOpenApi(z);

// Main User Schema that matches your Mongoose model
export const UserSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format"),
  password: z.string().optional(), // Optional in responses for security
  salt: z.string().optional(), // Optional in responses for security
  role: z.string().optional().default("user"),
  otp: z.string().optional(),
  isActivate: z.boolean().optional().default(true),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  isLocked: z.boolean().optional().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Public User Schema (without sensitive fields like password, salt, otp)
export const PublicUserSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  isActivate: z.boolean(),
  avatarUrl: z.string().optional(),
  isLocked: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema for user registration/creation
export const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    role: z.string().optional().default("user"),
    avatarUrl: z
      .string()
      .url("Invalid avatar URL")
      .optional()
      .or(z.literal("")),
  }),
});

// Schema for user login
export const LoginUserSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
    otp: z.string().optional(),
  }),
});

// Schema for user registration (public registration)
export const RegisterUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    avatarUrl: z
      .string()
      .url("Invalid avatar URL")
      .optional()
      .or(z.literal("")),
  }),
});

// Schema for updating user profile (by user themselves)
export const UpdateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name too long")
      .optional(),
    avatarUrl: z
      .string()
      .url("Invalid avatar URL")
      .optional()
      .or(z.literal("")),
    // Users cannot change their own email, role, activation status, etc.
  }),
});

// Schema for updating a user (admin only)
export const UpdateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name too long")
      .optional(),
    email: z.string().email("Invalid email format").optional(),
    role: z.string().optional(),
    isActivate: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    avatarUrl: z
      .string()
      .url("Invalid avatar URL")
      .optional()
      .or(z.literal("")),
    // Password updates should be handled separately for security
  }),
});

// Schema for changing password
export const ChangePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password too long")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        ),
      confirmPassword: z.string().min(1, "Password confirmation is required"),
    }),
  })
  .refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: "Passwords don't match",
    path: ["body", "confirmPassword"],
  });

// Schema for forgot password
export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

// Schema for reset password
export const ResetPasswordSchema = z
  .object({
    params: z.object({
      token: z.string().min(1, "Reset token is required"),
    }),
    body: z.object({
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password too long")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        ),
      confirmPassword: z.string().min(1, "Password confirmation is required"),
    }),
  })
  .refine((data) => data.body.password === data.body.confirmPassword, {
    message: "Passwords don't match",
    path: ["body", "confirmPassword"],
  });

// Schema for verifying email
export const VerifyEmailSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});

// Schema for getting a single user
export const GetUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});

// Schema for query parameters (pagination, filtering)
export const GetUsersQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform((val) => parseInt(val))
      .pipe(z.number().int().min(1))
      .optional()
      .default("1"),
    limit: z
      .string()
      .transform((val) => parseInt(val))
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default("10"),
    sortBy: z
      .enum(["name", "email", "role", "createdAt", "isActivate", "isLocked"])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    isActivate: z
      .string()
      .transform((val) => val === "true")
      .pipe(z.boolean())
      .optional(),
    isLocked: z
      .string()
      .transform((val) => val === "true")
      .pipe(z.boolean())
      .optional(),
    role: z.string().optional(),
    search: z.string().optional(), // Search in name and email
  }),
});

// Schema for deleting a user
export const DeleteUserSchema = z.object({
  query: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});

// Schema for checking if email exists
export const CheckEmailSchema = z.object({
  params: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

// Schema for sending OTP
export const SendOTPSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

// Schema for verifying OTP
export const VerifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: z
      .string()
      .min(4, "OTP must be at least 4 characters")
      .max(10, "OTP too long"),
  }),
});

// Schema for admin actions (lock/unlock user)
export const UserActionSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z.object({
    action: z.enum(["lock", "unlock", "activate", "deactivate"]),
    reason: z.string().optional(), // Optional reason for the action
  }),
});

// Export types for TypeScript
export type User = z.infer<typeof UserSchema>;
export type PublicUser = z.infer<typeof PublicUserSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type LoginUserRequest = z.infer<typeof LoginUserSchema>;
export type RegisterUserRequest = z.infer<typeof RegisterUserSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailSchema>;
export type GetUserRequest = z.infer<typeof GetUserSchema>;
export type GetUsersQueryRequest = z.infer<typeof GetUsersQuerySchema>;
export type DeleteUserRequest = z.infer<typeof DeleteUserSchema>;
export type CheckEmailRequest = z.infer<typeof CheckEmailSchema>;
export type SendOTPRequest = z.infer<typeof SendOTPSchema>;
export type VerifyOTPRequest = z.infer<typeof VerifyOTPSchema>;
export type UserActionRequest = z.infer<typeof UserActionSchema>;
