import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-[#171717] text-white flex flex-col items-center justify-center px-4 py-8 sm:py-12 antialiased select-none font-sans">
      <div className="w-full max-w-[760px] flex flex-col items-center text-center mx-auto">
        {/* Header Title - Enriched & Bigger */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-[34px] sm:text-[48px] md:text-[58px] font-extrabold text-white tracking-tight leading-tight">
            You&apos;re Drunk !
          </h1>
          <h2 className="text-[34px] sm:text-[48px] md:text-[58px] font-extrabold tracking-tight leading-tight mt-1 sm:mt-2">
            <span className="text-white">Go </span>
            <span className="text-[#FFE020]">Home</span>
          </h2>
        </div>

        {/* Peter Griffin Illustration & 404 - High-Res 4x & Scaled Up */}
        <div className="my-2 sm:my-4 flex items-center justify-center w-full">
          <Image
            src="/peter-404-scene-4x.png"
            alt="Peter Griffin sitting drunk at a bar booth - 404 Not Found"
            width={1480}
            height={712}
            priority
            className="w-full max-w-[460px] sm:max-w-[580px] md:max-w-[660px] h-auto object-contain pointer-events-none block"
          />
        </div>

        {/* Go back home Button - Bigger & Prominent */}
        <div className="mt-5 sm:mt-7 mb-4 sm:mb-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg bg-white text-black font-bold text-sm sm:text-base tracking-normal shadow-md hover:bg-neutral-200 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Go back home
          </Link>
        </div>

        {/* Explanatory Subtitle - Bigger & Centered */}
        <p className="max-w-[480px] sm:max-w-[540px] text-sm sm:text-base md:text-lg text-[#9CA3AF] leading-relaxed font-normal tracking-wide px-4">
          The page you are looking for doesn&apos;t exist or has been moved. Please go back to the homepage.
        </p>
      </div>
    </main>
  );
}
