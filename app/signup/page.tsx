"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatedCharacters, CharacterState } from "@/components/AnimatedCharacters";
import { useUser } from "@/components/UserContext";

export default function SignUpPage() {
  const router = useRouter();
  const { signUpUser } = useUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isTypingField, setIsTypingField] = useState<"name" | "email" | "password" | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const charState: CharacterState = {
    isTypingField,
    isPasswordVisible,
    isError,
    isSuccess,
    passwordLength: password.length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setIsError(true);
      setErrorMessage("Please enter your full name");
      return;
    }

    if (!email.trim()) {
      setIsError(true);
      setErrorMessage("Please enter your campus email");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    if (!agreeTerms) {
      setIsError(true);
      setErrorMessage("Please agree to campus trading terms");
      return;
    }

    setIsSubmitting(true);
    const res = await signUpUser(fullName.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setIsError(true);
      setErrorMessage(res.error || "Sign up failed. Please try again.");
      return;
    }

    setIsError(false);
    setIsSuccess(true);

    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <main className="min-h-screen w-full bg-[#1b1c21] flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans selection:bg-purple-200">
      <div className="relative w-full max-w-[1060px] bg-[#e8e8e8] rounded-[36px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col md:flex-row min-h-[660px]">
        
        {/* LEFT COLUMN: Animated Interactive Characters */}
        <section className="relative flex-1 md:w-[57%] bg-[#e8e8e8] flex flex-col justify-end items-center pt-8 px-2 sm:px-4 pb-0 overflow-hidden min-h-[360px] md:min-h-full">
          <Link
            href="/"
            className="absolute top-6 left-6 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 z-10"
          >
            <span className="text-base leading-none">←</span> Back to campus
          </Link>

          <div className="w-full h-full flex items-end justify-center">
            <AnimatedCharacters state={charState} />
          </div>
        </section>

        {/* RIGHT COLUMN: Sign Up Form Card */}
        <section className="w-full md:w-[43%] p-3 sm:p-3.5 bg-[#e8e8e8] flex items-stretch">
          <div className="w-full bg-white rounded-[26px] py-10 px-7 sm:px-11 flex flex-col justify-between shadow-xs">
            <div>
              {/* Top Star/Sparkle 4-Petal Logo */}
              <div className="flex justify-center mb-6">
                <svg viewBox="0 0 32 32" className="w-9 h-9 text-[#1b1c21] fill-current">
                  <mask id="notchCutSignUp">
                    <rect width="32" height="32" fill="white" />
                    <ellipse cx="11" cy="16" rx="2.5" ry="5" fill="black" />
                  </mask>
                  <g mask="url(#notchCutSignUp)">
                    <ellipse cx="16" cy="16" rx="4.2" ry="13.5" />
                    <ellipse cx="16" cy="16" rx="13.5" ry="4.2" />
                  </g>
                </svg>
              </div>

              <h1 className="text-3xl font-extrabold text-[#1b1c21] text-center tracking-tight">
                Create an account
              </h1>
              <p className="text-[13px] text-slate-500 text-center mt-2 mb-8 font-normal">
                Join verified students in fair campus bidding
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name Input */}
                <div className="group">
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
                    placeholder="e.g. Karthik Nair"
                    required
                    className="w-full bg-transparent border-0 border-b border-slate-300 py-1.5 px-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-0 transition-colors font-normal"
                  />
                </div>

                {/* Email Input */}
                <div className="group">
                  <label className="block text-[13px] font-semibold text-slate-800 mb-1">
                    Campus Email
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
                    placeholder="student@campus.edu"
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
                      placeholder="At least 6 characters"
                      required
                      className={`w-full bg-transparent border-0 border-b py-1.5 pr-8 pl-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors font-normal ${
                        isError
                          ? "border-red-500 focus:border-red-600"
                          : "border-slate-300 focus:border-slate-900"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      className="absolute right-0 text-slate-700 hover:text-slate-900 p-1 focus:outline-none transition-transform active:scale-95 cursor-pointer"
                      title={isPasswordVisible ? "Hide password" : "Show password"}
                      aria-label="Toggle password visibility"
                    >
                      {isPasswordVisible ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 11c2.5 4 13.5 4 16 0" />
                          <line x1="6.5" y1="13.5" x2="4.5" y2="16.5" />
                          <line x1="12" y1="14" x2="12" y2="18" />
                          <line x1="17.5" y1="13.5" x2="19.5" y2="16.5" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                          <path d="M12 9.5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 1 0-5" fill="currentColor" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {isError && errorMessage && (
                    <p className="text-[11px] text-red-500 mt-1 animate-in fade-in duration-150">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="flex items-center text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#1b1c21] focus:ring-slate-900 cursor-pointer accent-[#1b1c21]"
                    />
                    <span className="text-slate-600 font-normal">
                      I agree to campus fair-bidding honor code
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSuccess || isSubmitting}
                  className="w-full bg-[#1b1c21] hover:bg-black text-white font-medium py-3 rounded-full text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold">
                      <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Account Created!
                    </span>
                  ) : isSubmitting ? (
                    "Creating Account..."
                  ) : (
                    "Sign Up"
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Link to Login */}
            <div className="text-center pt-6 text-xs text-slate-500 font-normal">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-slate-900 hover:underline cursor-pointer ml-1">
                Log In
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
