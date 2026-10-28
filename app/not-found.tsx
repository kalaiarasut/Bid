import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-[#171717] text-white flex flex-col items-center justify-center px-4 py-8 antialiased select-none font-sans">
      <div className="w-full max-w-[500px] flex flex-col items-center text-center">
        {/* Header Title */}
        <div className="mb-4">
          <h1 className="text-[30px] sm:text-[36px] font-bold text-white tracking-tight leading-tight">
            You&apos;re Drunk !
          </h1>
          <h2 className="text-[30px] sm:text-[36px] font-bold tracking-tight leading-tight mt-1">
            <span className="text-white">Go </span>
            <span className="text-[#FFE020]">Home</span>
          </h2>
        </div>

        {/* Peter Griffin Illustration & 404 */}
        <div className="relative w-full max-w-[360px] aspect-[370/178] my-2 flex items-center justify-center">
          <Image
            src="/peter-404-scene-2x.png"
            alt="Peter Griffin sitting drunk at a bar booth - 404 Not Found"
            fill
            priority
            sizes="(max-width: 640px) 340px, 360px"
            className="object-contain pointer-events-none"
          />
        </div>

        {/* Go back home Button */}
        <div className="mt-4 mb-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-[4px] bg-white text-black font-bold text-[11px] sm:text-[12px] tracking-normal shadow-sm hover:bg-neutral-200 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Go back home
          </Link>
        </div>

        {/* Explanatory Subtitle */}
        <p className="max-w-[340px] text-[12px] sm:text-[13px] text-[#8E9297] leading-relaxed font-normal tracking-wide px-2">
          The page you are looking for doesn&apos;t exist or has been moved. Please go back to the homepage.
        </p>
      </div>
    </main>
  );
}
