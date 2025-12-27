import { z } from 'zod'

// Email validation for Unijos domain
export const unijosEmailSchema = z
    .string()
    .email('Invalid email address')
    .refine((email) => email.endsWith('@unijos.edu.ng'), {
        message: 'Email must be a valid @unijos.edu.ng address',
    })

// Login schema
export const loginSchema = z.object({
    email: unijosEmailSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Registration schema
export const registrationSchema = z.object({
    email: unijosEmailSchema,
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    staffId: z.string().min(4, 'Staff ID is required'),
    department: z.string().min(2, 'Department is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

// Loan application schema
export const loanApplicationSchema = z.object({
    loanType: z.enum(['swift-relief', 'advancement', 'progress-plus']),
    salary: z.number().min(1, 'Salary is required'),
    loanAmount: z.number().min(1000, 'Minimum loan amount is ₦1,000'),
    tenure: z.number().min(1).max(48),
    purpose: z.string().min(10, 'Please provide loan purpose'),
    documents: z.array(z.any()).optional(),
})
