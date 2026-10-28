"use client";

import React, { useEffect, useState, useRef } from "react";

export interface CharacterState {
  isTypingField: "name" | "email" | "password" | null;
  isPasswordVisible: boolean;
  isError: boolean;
  isSuccess: boolean;
  passwordLength: number;
}

interface AnimatedCharactersProps {
  state: CharacterState;
}

export function AnimatedCharacters({ state }: AnimatedCharactersProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [normPos, setNormPos] = useState({ x: 0, y: 0 }); // -1 to 1 normalized
  const [isNearPassword, setIsNearPassword] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Periodic natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 140);
    }, 4000);

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

      // Detect if cursor is approaching password input area
      const isRightSide = e.clientX > rect.right - 40;
      const isPasswordY = Math.abs(e.clientY - (rect.top + rect.height * 0.55)) < 75;
      setIsNearPassword(isRightSide && isPasswordY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Pupil vector calculation
  const getPupilOffset = (eyeSvgX: number, eyeSvgY: number, maxRadius = 4.5) => {
    if (typeof window === "undefined" || !containerRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    const actualX = rect.left + (eyeSvgX / 570) * rect.width;
    const actualY = rect.top + (eyeSvgY / 500) * rect.height;

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
    const dist = Math.min(Math.hypot(dx, dy) / 32, maxRadius);

    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
    };
  };

  // State flags
  const isTypingEmail = state.isTypingField === "email" || state.isTypingField === "name";
  const isPasswordFocused = state.isTypingField === "password";
  
  // The iconic "Sneaky Peek" posture:
  // When password is focused and empty, or cursor moves close to the password area
  const isSneakyPeek =
    (isPasswordFocused && state.passwordLength === 0) ||
    (isNearPassword && state.passwordLength === 0 && !isTypingEmail);

  // When password dots are actively typed
  const isPasswordDots = isPasswordFocused && state.passwordLength > 0;

  // Active posture selection
  type Posture = "neutral" | "email" | "sneaky" | "dots" | "error" | "reveal";
  let posture: Posture = "neutral";

  if (state.isError) {
    posture = "error";
  } else if (state.isPasswordVisible && state.passwordLength > 0) {
    posture = "reveal";
  } else if (isPasswordDots) {
    posture = "dots";
  } else if (isSneakyPeek) {
    posture = "sneaky";
  } else if (isTypingEmail) {
    posture = "email";
  }

  // --- Purple Geometry ---
  const purplePaths: Record<Posture, string> = {
    neutral:
      "M 162,488 L 162,332 C 162,225 162,100 162,77 L 349,77 C 349,210 349,250 349,488 Z",
    email:
      "M 190,488 L 200,332 C 210,225 220,100 230,77 L 418,77 C 408,210 398,250 378,488 Z",
    sneaky:
      "M 162,488 L 153,332 C 160,225 215,100 309,22 L 426,149 C 370,210 330,250 349,488 Z",
    dots:
      "M 192,488 L 202,332 C 212,225 222,100 234,77 L 422,77 C 412,210 402,250 380,488 Z",
    error:
      "M 176,488 L 128,332 C 128,225 140,100 165,58 L 348,101 C 335,210 310,250 295,488 Z",
    reveal:
      "M 162,488 L 162,332 C 162,225 162,100 162,77 L 349,77 C 349,210 349,250 349,488 Z",
  };

  const purpleLeftPupil = getPupilOffset(227, 106, 4.5);
  const purpleRightPupil = getPupilOffset(280, 106, 4.5);

  // --- Black Geometry ---
  const blackPaths: Record<Posture, string> = {
    neutral:
      "M 299,488 L 299,350 C 299,300 299,250 299,197 L 413,197 C 413,250 413,350 413,488 Z",
    email:
      "M 315,488 L 320,350 C 325,300 330,250 335,197 L 449,197 C 440,250 430,350 420,488 Z",
    sneaky:
      "M 358,488 L 348,380 C 352,300 348,270 344,240 L 456,190 C 445,270 425,380 413,488 Z",
    dots:
      "M 315,488 L 320,350 C 325,300 330,250 335,197 L 449,197 C 440,250 430,350 420,488 Z",
    error:
      "M 299,488 L 299,410 C 299,380 299,340 299,269 L 413,269 C 413,340 413,380 413,488 Z",
    reveal:
      "M 299,488 L 299,350 C 299,300 299,250 299,197 L 413,197 C 413,250 413,350 413,488 Z",
  };

  const blackLeftPupil = getPupilOffset(332, 226, 4.0);
  const blackRightPupil = getPupilOffset(362, 226, 4.0);

  // --- Yellow Geometry ---
  const yellowPaths: Record<Posture, string> = {
    neutral:
      "M 385,488 L 385,341 C 385,290 420,276 450,276 C 480,276 515,290 515,341 L 515,488 Z",
    email:
      "M 387,488 L 395,350 C 400,300 430,278 465,278 C 500,278 535,295 540,345 L 530,488 Z",
    sneaky:
      "M 388,488 L 415,360 C 420,320 440,280 475,280 C 510,280 545,310 545,358 L 545,488 Z",
    dots:
      "M 387,488 L 395,350 C 400,300 430,278 465,278 C 500,278 535,295 540,345 L 530,488 Z",
    error:
      "M 385,488 L 385,341 C 385,290 420,273 450,273 C 480,273 515,290 515,341 L 515,488 Z",
    reveal:
      "M 385,488 L 385,341 C 385,290 420,276 450,276 C 480,276 515,290 515,341 L 515,488 Z",
  };

  // Yellow eye & mouth
  const isYellowLookingRight = normPos.x > 0.1 || posture !== "neutral";
  const isYellowLookingLeft = normPos.x < -0.2 && posture === "neutral";

  // --- Orange Face Coordinates ---
  // In neutral tracking, face shifts smoothly across dome
  const orangeTrackX = normPos.x * 22;
  const orangeTrackY = normPos.y * 12;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-end justify-center select-none overflow-hidden"
    >
      <svg
        viewBox="0 0 570 500"
        preserveAspectRatio="xMidYMax meet"
        data-posture={posture}
        data-field={state.isTypingField || "none"}
        data-pwd-len={state.passwordLength}
        className="w-full max-w-[570px] h-auto block drop-shadow-sm transition-transform duration-75"
      >
        {/* ================================================================ */}
        {/* 1. PURPLE CHARACTER (Back Left)                                  */}
        {/* ================================================================ */}
        <g>
          {/* Morphing purple body with matching SVG command count */}
          <path
            d={purplePaths[posture]}
            fill="#6312f5"
            style={{
              transition: "d 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          />

          {/* Purple Face Features */}
          {posture === "sneaky" ? (
            // SNEAKY PEEK FACE: angled head with eyes peering down-right at password
            <g style={{ transition: "opacity 0.2s ease" }}>
              {/* Left Eye */}
              <circle cx="337" cy="124" r="7.5" fill="#ffffff" />
              <circle cx="340.5" cy="127.5" r="4" fill="#1b1c21" />

              {/* Right Eye */}
              <circle cx="377" cy="161" r="7.5" fill="#ffffff" />
              <circle cx="380.5" cy="164.5" r="4" fill="#1b1c21" />

              {/* Angled notch mouth slot */}
              <rect
                x="349"
                y="136"
                width="6"
                height="20"
                rx="3"
                fill="#1b1c21"
                transform="rotate(43 352 146)"
              />
            </g>
          ) : posture === "error" ? (
            // Error face: sad eyes and frown
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="230" cy="130" r="7.5" fill="#ffffff" />
              <circle cx="228" cy="132" r="4" fill="#1b1c21" />

              <circle cx="282" cy="136" r="7.5" fill="#ffffff" />
              <circle cx="280" cy="138" r="4" fill="#1b1c21" />

              <path
                d="M 246,166 Q 256,152 266,166"
                stroke="#1b1c21"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : posture === "email" || posture === "dots" ? (
            // Email / Dots posture: peering right with vertical notch
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="325" cy="106" r="7.5" fill="#ffffff" />
              <circle cx="328.5" cy="106" r="4" fill="#1b1c21" />

              <circle cx="386" cy="106" r="7.5" fill="#ffffff" />
              <circle cx="389.5" cy="106" r="4" fill="#1b1c21" />

              <rect x="357" y="98" width="6" height="36" rx="3" fill="#1b1c21" />
            </g>
          ) : (
            // Neutral tracking face
            <g
              style={{
                transform: isBlinking ? "scaleY(0.1)" : "scaleY(1)",
                transformOrigin: "253px 106px",
                transition: "transform 0.08s ease-in-out",
              }}
            >
              {/* Left Eye */}
              <circle cx="227" cy="106" r="8.5" fill="#ffffff" />
              <circle
                cx={227 + purpleLeftPupil.x}
                cy={106 + purpleLeftPupil.y}
                r="4.2"
                fill="#1b1c21"
              />

              {/* Right Eye */}
              <circle cx="280" cy="106" r="8.5" fill="#ffffff" />
              <circle
                cx={280 + purpleRightPupil.x}
                cy={106 + purpleRightPupil.y}
                r="4.2"
                fill="#1b1c21"
              />

              {/* Mouth */}
              <path
                d="M 246,128 Q 254,136 262,128"
                stroke="#1b1c21"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}
        </g>

        {/* ================================================================ */}
        {/* 2. BLACK CHARACTER (Middle Behind Yellow)                        */}
        {/* ================================================================ */}
        <g>
          {/* Black body */}
          <path
            d={blackPaths[posture]}
            fill="#1b1c21"
            style={{
              transition: "d 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          />

          {/* Black Face Features */}
          {posture === "sneaky" ? (
            // SNEAKY PEEK: white eyes bulging up-right toward password
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="391.7" cy="236.6" r="8" fill="#ffffff" />
              <circle cx="394.5" cy="232.5" r="4.5" fill="#1b1c21" />

              <circle cx="419.4" cy="224.7" r="8" fill="#ffffff" />
              <circle cx="422.5" cy="220.5" r="4.5" fill="#1b1c21" />
            </g>
          ) : posture === "dots" ? (
            // Password dots: staring straight UP!
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="347" cy="226" r="8" fill="#ffffff" />
              <circle cx="347" cy="220" r="4.5" fill="#1b1c21" />

              <circle cx="377" cy="226" r="8" fill="#ffffff" />
              <circle cx="377" cy="220" r="4.5" fill="#1b1c21" />
            </g>
          ) : posture === "email" ? (
            // Email: looking right
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="347" cy="226" r="8" fill="#ffffff" />
              <circle cx="351" cy="226" r="4.5" fill="#1b1c21" />

              <circle cx="377" cy="226" r="8" fill="#ffffff" />
              <circle cx="381" cy="226" r="4.5" fill="#1b1c21" />
            </g>
          ) : posture === "error" ? (
            // Error: ducked down
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="332" cy="296" r="8" fill="#ffffff" />
              <circle cx="330" cy="298" r="4.5" fill="#1b1c21" />

              <circle cx="362" cy="296" r="8" fill="#ffffff" />
              <circle cx="360" cy="298" r="4.5" fill="#1b1c21" />
            </g>
          ) : (
            // Neutral mouse tracking
            <g>
              <circle cx="332" cy="226" r="8" fill="#ffffff" />
              <circle
                cx={332 + blackLeftPupil.x}
                cy={226 + blackLeftPupil.y}
                r="4.2"
                fill="#1b1c21"
              />

              <circle cx="362" cy="226" r="8" fill="#ffffff" />
              <circle
                cx={362 + blackRightPupil.x}
                cy={226 + blackRightPupil.y}
                r="4.2"
                fill="#1b1c21"
              />
            </g>
          )}
        </g>

        {/* ================================================================ */}
        {/* 3. YELLOW CHARACTER (Front Right)                                */}
        {/* ================================================================ */}
        <g>
          {/* Yellow Arch Body */}
          <path
            d={yellowPaths[posture]}
            fill="#e5c819"
            style={{
              transition: "d 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          />

          {/* Yellow Face Features */}
          {posture === "sneaky" ? (
            // SNEAKY: leaning forward, beak sticking right, eye watching
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="485" cy="309" r="5" fill="#1b1c21" />
              <line
                x1="519"
                y1="339"
                x2="550"
                y2="339"
                stroke="#1b1c21"
                strokeWidth="5.5"
                strokeLinecap="square"
              />
            </g>
          ) : posture === "dots" ? (
            // Squinted slit eye & horizontal beak
            <g style={{ transition: "opacity 0.2s ease" }}>
              <line
                x1="472"
                y1="310"
                x2="488"
                y2="310"
                stroke="#1b1c21"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="480"
                y1="340"
                x2="546"
                y2="340"
                stroke="#1b1c21"
                strokeWidth="5.5"
                strokeLinecap="square"
              />
            </g>
          ) : posture === "error" ? (
            // Wavy mouth ~ and dot eye
            <g style={{ transition: "opacity 0.2s ease" }}>
              <circle cx="420" cy="340" r="5" fill="#1b1c21" />
              <path
                d="M 430,358 Q 445,348 460,358 T 490,358"
                stroke="#1b1c21"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : isYellowLookingRight ? (
            // Looking right: eye at right, beak right
            <g>
              <circle cx="460" cy="322" r="5" fill="#1b1c21" />
              <line
                x1="460"
                y1="344"
                x2="535"
                y2="344"
                stroke="#1b1c21"
                strokeWidth="5.5"
                strokeLinecap="square"
              />
            </g>
          ) : isYellowLookingLeft ? (
            // Looking left: eye at left, beak left
            <g>
              <circle cx="415" cy="322" r="5" fill="#1b1c21" />
              <line
                x1="365"
                y1="344"
                x2="440"
                y2="344"
                stroke="#1b1c21"
                strokeWidth="5.5"
                strokeLinecap="square"
              />
            </g>
          ) : (
            // Centered look
            <g>
              <circle cx="415" cy="322" r="4.5" fill="#1b1c21" />
              <circle cx="460" cy="322" r="4.5" fill="#1b1c21" />
              <line
                x1="385"
                y1="344"
                x2="458"
                y2="344"
                stroke="#1b1c21"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>

        {/* ================================================================ */}
        {/* 4. ORANGE CHARACTER (Front Left Semicircle Dome)                 */}
        {/* ================================================================ */}
        <g>
          {/* Orange Dome (Stationary Base) */}
          <path d="M 36,488 A 161,165 0 0,1 358,488 Z" fill="#f27b37" />

          {/* Orange Face Features */}
          {posture === "sneaky" ? (
            // SNEAKY PEEK: Face shifted to top-right of dome peering at password
            <g style={{ transition: "opacity 0.25s ease" }}>
              <circle cx="252" cy="390" r="6.5" fill="#1b1c21" />
              <circle cx="287" cy="409" r="6.5" fill="#1b1c21" />
              <circle cx="323" cy="405" r="6.5" fill="#1b1c21" />
            </g>
          ) : posture === "dots" ? (
            // PASSWORD DOTS: Shy hide! Only single peeking dot on back/shoulder
            <g style={{ transition: "opacity 0.25s ease" }}>
              <circle cx="288" cy="391" r="7" fill="#1b1c21" />
            </g>
          ) : posture === "reveal" ? (
            // REVEAL: Cute squinting closed smiling arches ^  ^
            <g style={{ transition: "opacity 0.25s ease" }}>
              <path
                d="M 103,410 Q 111,402 119,410"
                stroke="#1b1c21"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="135" cy="418" r="3.5" fill="#1b1c21" />
              <path
                d="M 139,403 Q 147,395 155,403"
                stroke="#1b1c21"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : posture === "email" ? (
            // Email focus: shifted right with cute "o" mouth
            <g style={{ transition: "opacity 0.25s ease" }}>
              <circle cx="246" cy="391" r="6.5" fill="#1b1c21" />
              <circle cx="286" cy="396" r="6.5" fill="#1b1c21" />
              <circle cx="318" cy="377" r="6.5" fill="#1b1c21" />
            </g>
          ) : posture === "error" ? (
            // Error: sad eyes and sad curved frown
            <g style={{ transition: "opacity 0.25s ease" }}>
              <circle cx="221" cy="442" r="6.5" fill="#1b1c21" />
              <circle cx="293" cy="450" r="6.5" fill="#1b1c21" />
              <path
                d="M 242,470 Q 253,458 264,470"
                stroke="#1b1c21"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            // Neutral tracking: face translates across dome with mouse
            <g
              style={{
                transform: `translate(${orangeTrackX}px, ${orangeTrackY}px)`,
                transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
              <circle cx="149" cy="420" r="6.5" fill="#1b1c21" />
              <circle cx="222" cy="425" r="6.5" fill="#1b1c21" />
              {/* Crescent smile */}
              <path
                d="M 173,432 Q 186,448 199,432 Z"
                fill="#1b1c21"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
