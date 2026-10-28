"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "buyer" | "seller" | "admin";
  student_id: string | null;
  hostel_block: string | null;
  room_number: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  rating: number;
  total_ratings: number;
}

export const MOCK_STUDENTS: StudentProfile[] = [
  {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    full_name: "Rahul Sharma",
    email: "rahul.sharma@campus.edu",
    role: "seller",
    student_id: "2021CSB1042",
    hostel_block: "Hostel 3 (Brahmaputra)",
    room_number: "B-214",
    phone_number: "+91 98765 43210",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    rating: 4.92,
    total_ratings: 19,
  },
  {
    id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    full_name: "Ananya Patel",
    email: "ananya.patel@campus.edu",
    role: "buyer",
    student_id: "2023EEB1108",
    hostel_block: "Hostel 7 (Kaveri - Girls)",
    room_number: "G-102",
    phone_number: "+91 98765 43211",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    rating: 5.0,
    total_ratings: 6,
  },
  {
    id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    full_name: "Karthik Nair",
    email: "karthik.nair@campus.edu",
    role: "buyer",
    student_id: "2023MEB1204",
    hostel_block: "Hostel 2 (Ganga)",
    room_number: "A-309",
    phone_number: "+91 98765 43212",
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
    rating: 4.85,
    total_ratings: 11,
  },
  {
    id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    full_name: "Priya Singh",
    email: "priya.singh@campus.edu",
    role: "seller",
    student_id: "2021CHB1015",
    hostel_block: "Hostel 8 (Godavari - Girls)",
    room_number: "H-411",
    phone_number: "+91 98765 43213",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    rating: 4.96,
    total_ratings: 27,
  },
];

interface UserContextType {
  currentUser: StudentProfile;
  allStudents: StudentProfile[];
  switchUser: (userId: string) => void;
  loginUser: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUpUser: (fullName: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<StudentProfile>(MOCK_STUDENTS[1]); // Default to Ananya (Junior Buyer)
  const [allStudents, setAllStudents] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Load user from localStorage or fetch profiles from Supabase
  useEffect(() => {
    async function loadProfiles() {
      try {
        const { data, error } = await supabase.from("profiles").select("*");
        if (data && data.length > 0 && !error) {
          const formatted: StudentProfile[] = data.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            role: (p.role as any) || "student",
            student_id: p.student_id,
            hostel_block: p.hostel_block,
            room_number: p.room_number,
            phone_number: p.phone_number,
            avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name)}`,
            rating: Number(p.rating) || 5.0,
            total_ratings: Number(p.total_ratings) || 0,
          }));
          setAllStudents(formatted);

          const savedId = localStorage.getItem("campusbid_active_user");
          if (savedId) {
            const found = formatted.find((s) => s.id === savedId);
            if (found) setCurrentUser(found);
          }
        }
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    }
    loadProfiles();
  }, []);

  const refreshUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);
      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshUnreadCount();

    // Subscribe to notifications changes for current user
    const channel = supabase
      .channel(`user-notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id]);

  const switchUser = (userId: string) => {
    const student = allStudents.find((s) => s.id === userId);
    if (student) {
      setCurrentUser(student);
      localStorage.setItem("campusbid_active_user", student.id);
    }
  };

  const loginUser = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Try Supabase Auth if password is provided
      if (password) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (authError && authError.message !== "Invalid login credentials") {
            console.warn("Supabase auth warning:", authError.message);
          }
        } catch (e) {
          // Graceful fallback to profile sync
        }
      }

      // 2. Check if student profile exists in memory or in database
      const foundInMemory = allStudents.find((s) => s.email.toLowerCase() === email.toLowerCase());
      if (foundInMemory) {
        switchUser(foundInMemory.id);
        return { success: true };
      }

      // 3. Check Supabase profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", email.trim())
        .maybeSingle();

      if (profileData) {
        const student: StudentProfile = {
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email,
          role: (profileData.role as any) || "student",
          student_id: profileData.student_id,
          hostel_block: profileData.hostel_block,
          room_number: profileData.room_number,
          phone_number: profileData.phone_number,
          avatar_url: profileData.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileData.full_name)}`,
          rating: Number(profileData.rating) || 5.0,
          total_ratings: Number(profileData.total_ratings) || 0,
        };
        setAllStudents((prev) => [student, ...prev.filter((s) => s.id !== student.id)]);
        setCurrentUser(student);
        localStorage.setItem("campusbid_active_user", student.id);
        return { success: true };
      }

      // 4. If demo email, switch to first student or create demo session
      if (email.includes("@")) {
        const fallbackName = email.split("@")[0].replace(/[._]/g, " ");
        const capitalized = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
        const newStudent: StudentProfile = {
          id: crypto.randomUUID(),
          full_name: capitalized,
          email,
          role: "student",
          student_id: `2024CSB${Math.floor(1000 + Math.random() * 9000)}`,
          hostel_block: "Campus Hostel",
          room_number: "A-101",
          phone_number: "+91 98765 00000",
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(capitalized)}`,
          rating: 5.0,
          total_ratings: 0,
        };
        setAllStudents((prev) => [newStudent, ...prev]);
        setCurrentUser(newStudent);
        localStorage.setItem("campusbid_active_user", newStudent.id);
        return { success: true };
      }

      return { success: false, error: "Account not found. Please sign up." };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to log in" };
    }
  };

  const signUpUser = async (fullName: string, email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      let authUserId: string = crypto.randomUUID();

      // 1. Try Supabase Auth
      if (password) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });
          if (authData?.user?.id) {
            authUserId = authData.user.id;
          }
        } catch (e) {
          // Fallback to direct profile creation
        }
      }

      // 2. Insert into profiles table in Supabase
      const newStudent: StudentProfile = {
        id: authUserId,
        full_name: fullName,
        email,
        role: "student",
        student_id: `2024UG${Math.floor(1000 + Math.random() * 9000)}`,
        hostel_block: "Hostel 3 (Brahmaputra)",
        room_number: "C-104",
        phone_number: "+91 98765 11111",
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        rating: 5.0,
        total_ratings: 0,
      };

      try {
        await supabase.from("profiles").upsert({
          id: newStudent.id,
          full_name: newStudent.full_name,
          email: newStudent.email,
          role: newStudent.role,
          student_id: newStudent.student_id,
          hostel_block: newStudent.hostel_block,
          room_number: newStudent.room_number,
          phone_number: newStudent.phone_number,
          avatar_url: newStudent.avatar_url,
          rating: 5.0,
          total_ratings: 0,
        });
      } catch (dbErr) {
        console.warn("Could not upsert to Supabase profiles:", dbErr);
      }

      // 3. Set active user in context and storage
      setAllStudents((prev) => [newStudent, ...prev.filter((s) => s.id !== newStudent.id)]);
      setCurrentUser(newStudent);
      localStorage.setItem("campusbid_active_user", newStudent.id);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Sign up failed" };
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        allStudents,
        switchUser,
        loginUser,
        signUpUser,
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
