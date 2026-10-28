"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatedCharacters, CharacterState } from "@/components/AnimatedCharacters";
import { useUser } from "@/components/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { allStudents, switchUser } = useUser();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("anna@gmail.com");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isTypingField, setIsTypingField] = useState<"name" | "email" | "password" | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Character emotional & physical animation state
  const charState: CharacterState = {
    isTypingField,
    isPasswordVisible,
    isError,
    isSuccess,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setIsError(true);
      setErrorMessage("Please enter your email");
      return;
    }

    if (mode === "login") {
      // Demo: if password is wrong (matches the video where wrong password shakes and characters frown)
      if (
        password.length > 0 &&
        password !== "777G555A" &&
        password !== "password" &&
        password !== "campus123" &&
        password !== "anna123"
      ) {
        setIsError(true);
        setErrorMessage("Incorrect password. Please try again.");
        setTimeout(() => {
          setIsError(false);
        }, 3200);
        return;
      }
    } else {
      // Sign up validation
      if (!fullName) {
        setIsError(true);
        setErrorMessage("Please enter your full name");
        return;
      }
      if (password.length < 6) {
        setIsError(true);
        setErrorMessage("Password must be at least 6 characters");
        setTimeout(() => {
          setIsError(false);
        }, 3200);
        return;
      }
    }

    // Success login or signup
    setIsError(false);
    setIsSuccess(true);

    const matched = allStudents.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      switchUser(matched.id);
    }

    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  const handleGoogleAuth = () => {
    setIsSuccess(true);
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <main className="min-h-screen w-full bg-[#1b1c21] flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans selection:bg-purple-200">
      {/* Centered Main Login Container Card */}
      <div className="relative w-full max-w-[1060px] bg-[#e8e8e8] rounded-[36px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col md:flex-row min-h-[660px]">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: Animated Interactive Characters                   */}
        {/* ============================================================== */}
        <section className="relative flex-1 md:w-[57%] bg-[#e8e8e8] flex flex-col justify-end items-center pt-8 px-4 sm:px-8 pb-0 overflow-hidden min-h-[360px] md:min-h-full">
          {/* Subtle back link */}
          <Link
            href="/"
            className="absolute top-6 left-6 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 z-10"
          >
            <span className="text-base leading-none">←</span> Back to campus
          </Link>

          {/* Characters Container with Cursor Tracking */}
          <div className="w-full h-full flex items-end justify-center">
            <AnimatedCharacters state={charState} />
          </div>
        </section>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: White Form Card                                  */}
        {/* ============================================================== */}
        <section className="w-full md:w-[43%] p-3 sm:p-3.5 bg-[#e8e8e8] flex items-stretch">
          <div className="w-full bg-white rounded-[26px] py-10 px-7 sm:px-11 flex flex-col justify-between shadow-xs">
            
            <div>
              {/* Top Star/Sparkle 4-Petal Logo */}
              <div className="flex justify-center mb-6">
                <svg
                  viewBox="0 0 32 32"
                  className="w-9 h-9 text-[#1b1c21] fill-current"
                >
                  <mask id="notchCut">
                    <rect width="32" height="32" fill="white" />
                    <ellipse cx="11" cy="16" rx="2.5" ry="5" fill="black" />
                  </mask>
                  <g mask="url(#notchCut)">
                    <ellipse cx="16" cy="16" rx="4.2" ry="13.5" />
                    <ellipse cx="16" cy="16" rx="13.5" ry="4.2" />
                  </g>
                </svg>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-3xl font-extrabold text-[#1b1c21] text-center tracking-tight">
                {mode === "login" ? "Welcome back!" : "Create an account"}
              </h1>
              <p className="text-[13px] text-slate-500 text-center mt-2 mb-8 font-normal">
                {mode === "login"
                  ? "Please enter your details"
                  : "Please enter your details to sign up"}
              </p>

              {/* Login / Sign Up Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Full Name Input (Sign Up Mode) */}
                {mode === "signup" && (
                  <div className="group animate-in fade-in duration-200">
                    <label className="block text-[13px] font-semibold text-slate-800 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (isError) setIsError(false);
                      }}
                      onFocus={() => setIsTypingField("name")}
                      onBlur={() => setIsTypingField(null)}
                      placeholder="Enter your name"
                      required
                      className="w-full bg-transparent border-0 border-b border-slate-300 py-1.5 px-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-0 transition-colors font-normal"
                    />
                  </div>
                )}

                {/* Email Input */}
                <div className="group">
                  <label className="block text-[13px] font-semibold text-slate-800 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (isError) setIsError(false);
                    }}
                    onFocus={() => setIsTypingField("email")}
                    onBlur={() => setIsTypingField(null)}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-transparent border-0 border-b border-slate-300 py-1.5 px-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-0 transition-colors font-normal"
                  />
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <label
                    className={`block text-[13px] font-semibold transition-colors mb-1 ${
                      isError ? "text-red-500 font-bold" : "text-slate-800"
                    }`}
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={isPasswordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (isError) setIsError(false);
                      }}
                      onFocus={() => setIsTypingField("password")}
                      onBlur={() => setIsTypingField(null)}
                      placeholder="••••••••"
                      required
                      className={`w-full bg-transparent border-0 border-b py-1.5 pr-8 pl-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors font-normal ${
                        isError
                          ? "border-red-500 focus:border-red-600"
                          : "border-slate-300 focus:border-slate-900"
                      }`}
                    />
                    
                    {/* Password Show/Hide Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      className="absolute right-0 text-slate-700 hover:text-slate-900 p-1 focus:outline-none transition-transform active:scale-95 cursor-pointer"
                      title={isPasswordVisible ? "Hide password" : "Show password"}
                      aria-label="Toggle password visibility"
                    >
                      {isPasswordVisible ? (
                        /* Closed eye with downward lashes */
                        <svg
                          viewBox="0 0 24 24"
                          className="w-5 h-5 fill-none stroke-current"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 11c2.5 4 13.5 4 16 0" />
                          <line x1="6.5" y1="13.5" x2="4.5" y2="16.5" />
                          <line x1="12" y1="14" x2="12" y2="18" />
                          <line x1="17.5" y1="13.5" x2="19.5" y2="16.5" />
                        </svg>
                      ) : (
                        /* Open eye with crescent pupil */
                        <svg
                          viewBox="0 0 24 24"
                          className="w-5 h-5 fill-none stroke-current"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                          <path
                            d="M12 9.5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 1 0-5"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Error hint if present */}
                  {isError && errorMessage && (
                    <p className="text-[11px] text-red-500 mt-1 animate-in fade-in duration-150">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password (or Terms in signup) */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#1b1c21] focus:ring-slate-900 cursor-pointer accent-[#1b1c21]"
                    />
                    <span className="text-slate-600 font-normal">
                      {mode === "login" ? "Remember for 30 days" : "Agree to terms & conditions"}
                    </span>
                  </label>

                  {mode === "login" && (
                    <a
                      href="#forgot"
                      onClick={(e) => e.preventDefault()}
                      className="text-slate-500 hover:text-slate-900 transition-colors font-normal"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isSuccess}
                  className="w-full bg-[#1b1c21] hover:bg-black text-white font-medium py-3 rounded-full text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold">
                      <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {mode === "login" ? "Logged In!" : "Account Created!"}
                    </span>
                  ) : mode === "login" ? (
                    "Log In"
                  ) : (
                    "Sign Up"
                  )}
                </button>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full bg-[#f3f4f6] hover:bg-[#eaecee] text-slate-800 font-medium py-2.5 rounded-full text-sm transition-all flex items-center justify-center gap-2.5 shadow-2xs active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>{mode === "login" ? "Log in with Google" : "Sign up with Google"}</span>
                </button>
              </form>
            </div>

            {/* Bottom Mode Switcher */}
            <div className="text-center pt-8 text-xs text-slate-500 font-normal">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setIsError(false);
                      setPassword("");
                    }}
                    className="font-bold text-slate-900 hover:underline cursor-pointer ml-1"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setIsError(false);
                      setPassword("");
                    }}
                    className="font-bold text-slate-900 hover:underline cursor-pointer ml-1"
                  >
                    Log In
                  </button>
                </>
              )}
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}
