import { z } from "zod";

// --- AUTHENTICATION SCHEMAS ---

export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(7, "Invalid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    // Make role an optional string, defaulting to 'user' if not passed
    role: z.string().optional().default('user'), 
    // Make these optional since companions registering don't provide care_details
    whoIsCareFor: z.string().optional(),
    memberName: z.string().optional(),
    agreeToShare: z.boolean().optional().default(false)
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required")
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format")
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters long")
});

// --- PUBLIC LEAD INTAKE SCHEMAS ---

export const callbackSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(7, "Invalid phone number"),
    whoIsThisFor: z.string().min(2, "Selection is required"),
    bestTimeToCall: z.string().min(2, "Please provide a time strategy"),
    message: z.string().optional()
});

// --- 🔥 NEW: ADMIN ONBOARDING & MATCHING SCHEMAS ---

export const activateClientSchema = z.object({
    clientId: z.string().uuid("Invalid client identification code structure"),
    companionId: z.string().uuid("Invalid companion identification code structure"),
    // Validates standard ISO Date strings (YYYY-MM-DD)
    serviceStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must follow YYYY-MM-DD format"),
    serviceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must follow YYYY-MM-DD format")
});

// --- 🔥 NEW: COMPANION TASK BUCKET SCHEMAS ---

export const createBucketTaskSchema = z.object({
    clientId: z.string().uuid("Invalid client identification code structure"),
    bucketTitle: z.string().min(3, "Bucket title must be at least 3 characters long"),
    bucketDescription: z.string().optional(),
    // Ensures the checklist array contains structured items matching your database
    items: z.array(
        z.object({
            item_title: z.string().min(2, "Task item description is required"),
            // Validates 24-hour time format string (HH:MM or HH:MM:SS)
            scheduled_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Time must follow HH:MM format")
        })
    ).min(1, "You must supply at least one actionable tracking checklist entry")
});