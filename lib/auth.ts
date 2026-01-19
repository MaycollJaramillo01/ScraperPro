import { getServiceRoleClient } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// Admin email from environment variable
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "Maycolljaramillo01@gmail.com";

export interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  approved: boolean;
}

/**
 * Check if an email is the admin email
 */
export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Get user by email from database
 */
export async function getUserByEmail(
  email: string,
): Promise<User | null> {
  try {
    const supabase = getServiceRoleClient();
    
    // First check if user exists in auth.users (Supabase SDK doesn't expose getUserByEmail)
    const emailLower = email.toLowerCase();
    const perPage = 200;
    const maxPages = 25;
    let page = 1;
    let authUser: { id: string; email?: string | null } | null = null;

    while (page <= maxPages) {
      const { data, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        return null;
      }

      const match = data.users.find(
        (user) => user.email?.toLowerCase() === emailLower,
      );
      if (match) {
        authUser = match;
        break;
      }

      if (!data.nextPage || data.users.length < perPage) {
        break;
      }

      page = data.nextPage;
    }

    if (!authUser) {
      return null;
    }

    // Check if user exists in our users table
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error || !userData) {
      // If user doesn't exist in users table, create it
      const newUser = {
        id: authUser.id,
        email: email.toLowerCase(),
        role: isAdminEmail(email) ? "admin" : "user",
        approved: isAdminEmail(email) ? true : false, // Admin is auto-approved
        created_at: new Date().toISOString(),
      };

      const { data: insertedUser, error: insertError } = await supabase
        .from("users")
        .insert([newUser])
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return null;
      }

      return insertedUser as User;
    }

    return userData as User;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUser(
  email: string,
  password: string,
  role: "admin" | "user" = "user",
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const supabase = getServiceRoleClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || "Failed to create user" };
    }

    // Create user in users table
    const { error: userError } = await supabase.from("users").insert([
      {
        id: authData.user.id,
        email: email.toLowerCase(),
        role,
        approved: role === "admin" ? true : false,
        created_at: new Date().toISOString(),
      },
    ]);

    if (userError) {
      // Rollback: delete auth user if user table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: userError.message };
    }

    return { success: true, userId: authData.user.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user is approved
 */
export async function isUserApproved(userId: string): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("users")
      .select("approved, role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return false;
    }

    // Admins are always approved
    if (data.role === "admin") {
      return true;
    }

    return data.approved === true;
  } catch (error) {
    console.error("Error checking user approval:", error);
    return false;
  }
}

/**
 * Approve a user (admin only)
 */
export async function approveUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from("users")
      .update({ approved: true })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting users:", error);
      return [];
    }

    return (data || []) as User[];
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
}

