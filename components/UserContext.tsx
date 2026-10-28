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

  return (
    <UserContext.Provider
      value={{
        currentUser,
        allStudents,
        switchUser,
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
