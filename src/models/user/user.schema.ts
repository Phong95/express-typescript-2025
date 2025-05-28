import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import z from "zod";
extendZodWithOpenApi(z);

export const UserSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(0).max(150).optional(),
  isActive: z.boolean().optional().default(true),
  role: z.string().optional().default("user"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema for creating a user (without _id, createdAt, updatedAt)
export const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    email: z.string().email("Invalid email format"),
    age: z.number().int().min(0).max(150).optional(),
    isActive: z.boolean().optional().default(true),
    role: z.string().optional().default("user"),
  }),
});

// Schema for updating a user
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
    age: z.number().int().min(0).max(150).optional(),
    isActive: z.boolean().optional(),
    role: z.string().optional(),
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
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val))
      .pipe(z.number().int().min(1).max(100))
      .optional(),
    sortBy: z.enum(["name", "email", "age", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    isActive: z
      .string()
      .transform((val) => val === "true")
      .pipe(z.boolean())
      .optional(),
    role: z.string().optional(),
    search: z.string().optional(),
  }),
});

// Schema for deleting a user
export const DeleteUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});

// Export types for TypeScript
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type GetUserRequest = z.infer<typeof GetUserSchema>;
export type GetUsersQueryRequest = z.infer<typeof GetUsersQuerySchema>;
export type DeleteUserRequest = z.infer<typeof DeleteUserSchema>;
