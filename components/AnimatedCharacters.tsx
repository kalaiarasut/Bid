"use client";

import React, { useEffect, useState, useRef } from "react";

export interface CharacterState {
  isTypingField: "name" | "email" | "password" | null;
  isPasswordVisible: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface AnimatedCharactersProps {
  state: CharacterState;
}

export function AnimatedCharacters({ state }: AnimatedCharactersProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [normPos, setNormPos] = useState({ x: 0, y: 0 }); // -1 to 1 normalized
  const [isBlinking, setIsBlinking] = useState(false);

  // Periodic natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 140);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, []);

  // Global mouse move listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const relX = e.clientX - centerX;
      const relY = e.clientY - centerY;

      const nx = Math.max(-1.5, Math.min(1.5, relX / (window.innerWidth / 2)));
      const ny = Math.max(-1.2, Math.min(1.2, relY / (window.innerHeight / 2)));

      setMousePos({ x: e.clientX, y: e.clientY });
      setNormPos({ x: nx, y: ny });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Pupil vector math
  const getPupilOffset = (eyeSvgX: number, eyeSvgY: number, maxRadius = 5) => {
    if (typeof window === "undefined" || !containerRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    const actualX = rect.left + (eyeSvgX / 540) * rect.width;
    const actualY = rect.top + (eyeSvgY / 440) * rect.height;

    // If typing, eyes lock on to the right panel / input field!
    let targetX = mousePos.x;
    let targetY = mousePos.y;

    if (state.isTypingField) {
      targetX = rect.right + 180;
      targetY =
        state.isTypingField === "password"
          ? rect.top + rect.height * 0.58
          : rect.top + rect.height * 0.45;
    }

    const dx = targetX - actualX;
    const dy = targetY - actualY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy) / 30, maxRadius);

    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
    };
  };

  const isTyping = Boolean(state.isTypingField);
  const isTypingPassword = state.isTypingField === "password";
  const isTypingEmail = state.isTypingField === "email" || state.isTypingField === "name";

  // --- 1. Entire Group Translation ---
  // When typing, the whole cluster creeps closer to the form trying to sneakily peek!
  const groupTranslateX = isTypingPassword ? 46 : isTypingEmail ? 36 : 0;

  // --- 2. Purple Character Math ---
  const purpleLeftPupil = getPupilOffset(186, 150, 5.0);
  const purpleRightPupil = getPupilOffset(256, 150, 5.0);

  // Purple leaning:
  // When typing email: bends strongly forward towards the email field
  // When typing password: leans intently toward password field
  // When mouse moves: leans dynamically with mouse X
  let purpleLean = normPos.x * 5.2;
  let purpleScaleY = 1;
  let purpleRotate = 0;

  if (isTypingEmail) {
    purpleLean = 14;
    purpleRotate = 6;
  } else if (isTypingPassword) {
    purpleLean = 11;
    purpleRotate = 3;
  } else if (state.isError) {
    purpleLean = 12;
  }

  // Profile mouth when looking right or typing
  const isPurpleProfile = normPos.x > 0.3 || isTyping;

  // Eyes squint when sneaky peeking at email!
  const isPurpleSquinting = isTypingEmail;

  // --- 3. Black Character Math ---
  const blackLeftPupil = getPupilOffset(310, 235, 4.2);
  const blackRightPupil = getPupilOffset(334, 235, 4.2);
  const blackDuck = state.isError ? 65 : 0;
  const blackLean = isTyping ? 5.5 : Math.max(-1.8, Math.min(3.2, normPos.x * 2.5));

  // --- 4. Yellow Character Math ---
  const yellowLookRight = normPos.x > 0.15 || isTyping;
  const yellowLookLeft = normPos.x < -0.25 && !isTyping;
  const yellowEyePupil = getPupilOffset(yellowLookRight ? 390 : 425, 258, 4.0);
  const yellowLean = isTyping ? 7 : normPos.x * 2;

  // --- 5. Orange Character Math ---
  let orangeFaceX = normPos.x * 28;
  let orangeFaceY = normPos.y * 15;

  if (isTypingPassword) {
    // Shyly hides / slides away down to the bottom right with single peeking eye
    orangeFaceX = 46;
    orangeFaceY = 26;
  } else if (isTypingEmail) {
    // Creeps to the right edge of the dome trying to peek!
    orangeFaceX = 40;
    orangeFaceY = 2;
  } else if (normPos.x > 0.5) {
    orangeFaceX = Math.min(36, orangeFaceX + 8);
    orangeFaceY = Math.max(-14, orangeFaceY - 5);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-end justify-center select-none overflow-hidden"
    >
      <svg
        viewBox="0 0 540 440"
        className="w-full max-w-[560px] h-auto drop-shadow-sm transition-transform duration-75 block"
        style={{
          transformOrigin: "bottom center",
        }}
      >
        {/* Whole character cluster moves closer when typing */}
        <g
          style={{
            transform: `translateX(${groupTranslateX}px)`,
            transition: "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {/* ============================================================== */}
          {/* 1. PURPLE CHARACTER (Back Left)                                */}
          {/* ============================================================== */}
          <g
            style={{
              transform: `skewX(${purpleLean}deg) rotate(${purpleRotate}deg)`,
              transformOrigin: "220px 440px",
              transition: "transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Purple Body */}
            {state.isError ? (
              // Crumpled / bent body when error
              <path
                d="M 152,440 L 132,290 L 162,220 L 142,100 L 278,100 L 258,220 L 288,290 L 288,440 Z"
                fill="#6312f5"
                className="transition-all duration-300"
              />
            ) : isTypingEmail ? (
              // Curved sneaky leaning body towards typing area
              <path
                d="M 152,440 C 160,320 195,190 252,90 L 332,130 C 275,230 252,340 252,440 Z"
                fill="#6312f5"
                className="transition-all duration-300"
              />
            ) : (
              <rect
                x="152"
                y="100"
                width="136"
                height="340"
                fill="#6312f5"
                className="transition-all duration-200"
              />
            )}

            {/* Left Eye */}
            <g
              style={{
                transform: isBlinking
                  ? "scaleY(0.1)"
                  : isPurpleSquinting
                  ? "scaleY(0.25)"
                  : "scaleY(1)",
                transformOrigin: "186px 150px",
                transition: "transform 0.08s ease-in-out",
              }}
            >
              <circle cx="186" cy="150" r="7.5" fill="#ffffff" />
              <circle
                cx={186 + (state.isError ? -2 : purpleLeftPupil.x)}
                cy={150 + (state.isError ? 2 : purpleLeftPupil.y)}
                r="3.5"
                fill="#1b1c21"
              />
            </g>

            {/* Right Eye */}
            <g
              style={{
                transform: isBlinking
                  ? "scaleY(0.1)"
                  : isPurpleSquinting
                  ? "scaleY(0.25)"
                  : "scaleY(1)",
                transformOrigin: "256px 150px",
                transition: "transform 0.08s ease-in-out",
              }}
            >
              <circle cx="256" cy="150" r="7.5" fill="#ffffff" />
              <circle
                cx={256 + (state.isError ? -2 : purpleRightPupil.x)}
                cy={150 + (state.isError ? 2 : purpleRightPupil.y)}
                r="3.5"
                fill="#1b1c21"
              />
            </g>

            {/* Purple Mouth / Nose */}
            {state.isError ? (
              // Sad frown
              <path
                d="M 216,178 Q 221,170 226,178"
                stroke="#1b1c21"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            ) : isPurpleProfile ? (
              // Profile vertical slit
              <rect
                x="225"
                y="158"
                width="3.5"
                height="19"
                rx="1.75"
                fill="#1b1c21"
                className="transition-all duration-150"
              />
            ) : (
              // Neutral curved smile
              <path
                d="M 216,172 Q 221,178 226,172"
                stroke="#1b1c21"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-150"
              />
            )}
          </g>

          {/* ============================================================== */}
          {/* 2. BLACK CHARACTER (Back Right, Behind Yellow & Orange)        */}
          {/* ============================================================== */}
          <g
            style={{
              transform: `translateY(${blackDuck}px) skewX(${blackLean}deg)`,
              transformOrigin: "330px 440px",
              transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Black Body */}
            <rect x="286" y="200" width="88" height="240" fill="#1b1c21" />

            {/* Left Eye */}
            <circle cx="310" cy="235" r="7" fill="#ffffff" />
            <circle
              cx={310 + blackLeftPupil.x}
              cy={235 + blackLeftPupil.y}
              r="3.2"
              fill="#1b1c21"
            />

            {/* Right Eye */}
            <circle cx="334" cy="235" r="7" fill="#ffffff" />
            <circle
              cx={334 + blackRightPupil.x}
              cy={235 + blackRightPupil.y}
              r="3.2"
              fill="#1b1c21"
            />
          </g>

          {/* ============================================================== */}
          {/* 3. YELLOW CHARACTER (Front Right)                              */}
          {/* ============================================================== */}
          <g
            style={{
              transform: `skewX(${yellowLean}deg)`,
              transformOrigin: "408px 440px",
              transition: "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Yellow Arch Body */}
            <path
              d="M 358,440 L 358,250 A 50,50 0 0,1 458,250 L 458,440 Z"
              fill="#e5c819"
            />

            {/* Yellow Face Features */}
            {state.isError ? (
              // Error: sad dot eye and wavy mouth
              <g>
                <circle cx="390" cy="258" r="4.5" fill="#1b1c21" />
                <path
                  d="M 388,276 Q 398,271 408,276 T 428,276"
                  fill="none"
                  stroke="#1b1c21"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            ) : isTypingPassword ? (
              // Password focused: squinting dash eye trying to peek
              <g>
                <line
                  x1="384"
                  y1="258"
                  x2="398"
                  y2="258"
                  stroke="#1b1c21"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="386"
                  y1="276"
                  x2="474"
                  y2="276"
                  stroke="#1b1c21"
                  strokeWidth="5.5"
                  strokeLinecap="square"
                />
              </g>
            ) : yellowLookRight ? (
              // Looking right: eye at left, mouth sticking out right towards input
              <g>
                <circle
                  cx={390 + yellowEyePupil.x}
                  cy={258 + yellowEyePupil.y}
                  r="4.5"
                  fill="#1b1c21"
                />
                <line
                  x1="390"
                  y1="276"
                  x2="475"
                  y2="276"
                  stroke="#1b1c21"
                  strokeWidth="5.5"
                  strokeLinecap="square"
                />
              </g>
            ) : yellowLookLeft ? (
              // Looking left: eye at right, mouth sticking out left
              <g>
                <circle
                  cx={425 + yellowEyePupil.x}
                  cy={258 + yellowEyePupil.y}
                  r="4.5"
                  fill="#1b1c21"
                />
                <line
                  x1="340"
                  y1="276"
                  x2="425"
                  y2="276"
                  stroke="#1b1c21"
                  strokeWidth="5.5"
                  strokeLinecap="square"
                />
              </g>
            ) : (
              // Looking Center: two dot eyes and horizontal mouth
              <g>
                <circle
                  cx={385 + yellowEyePupil.x}
                  cy={258 + yellowEyePupil.y}
                  r="4"
                  fill="#1b1c21"
                />
                <circle
                  cx={425 + yellowEyePupil.x}
                  cy={258 + yellowEyePupil.y}
                  r="4"
                  fill="#1b1c21"
                />
                <line
                  x1="382"
                  y1="276"
                  x2="428"
                  y2="276"
                  stroke="#1b1c21"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>

          {/* ============================================================== */}
          {/* 4. ORANGE CHARACTER (Front Left Semicircle Dome)               */}
          {/* ============================================================== */}
          <g>
            {/* Orange Dome */}
            <path d="M 75,440 A 130,130 0 0,1 335,440 Z" fill="#f27b37" />

            {/* Orange Face (Translates across the dome with cursor / typing) */}
            <g
              style={{
                transform: `translate(${orangeFaceX}px, ${orangeFaceY}px)`,
                transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
              {state.isError ? (
                // Frown and sad eyes
                <g>
                  <circle cx="180" cy="355" r="5.5" fill="#1b1c21" />
                  <circle cx="230" cy="355" r="5.5" fill="#1b1c21" />
                  <path
                    d="M 197,372 Q 205,360 213,372"
                    stroke="#1b1c21"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : state.isPasswordVisible ? (
                // Secret revealed! Cute closed smiling squint arcs
                <g>
                  <path
                    d="M 174,354 Q 182,345 190,354"
                    stroke="#1b1c21"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 222,354 Q 230,345 238,354"
                    stroke="#1b1c21"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle cx="206" cy="365" r="3.2" fill="#1b1c21" />
                </g>
              ) : isTypingPassword ? (
                // Password being typed: orange hides, only single shy peeking eye visible
                <g>
                  <circle cx="230" cy="355" r="5.5" fill="#1b1c21" />
                </g>
              ) : (
                // Neutral / Email tracking: happy face peering right
                <g>
                  <circle cx="180" cy="352" r="5.5" fill="#1b1c21" />
                  <circle cx="230" cy="352" r="5.5" fill="#1b1c21" />
                  {/* Cute crescent smile */}
                  <path
                    d="M 196,362 Q 205,376 214,362 Z"
                    fill="#1b1c21"
                  />
                </g>
              )}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
