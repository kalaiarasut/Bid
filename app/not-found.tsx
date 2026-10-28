import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-6">Could not find requested campus auction or page.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
      >
        Return to Marketplace
      </Link>
    </div>
  );
}
