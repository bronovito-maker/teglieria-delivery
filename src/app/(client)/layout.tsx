import Link from "next/link";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-orange-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/menu" className="text-2xl font-bold">
            Teglieria
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-4">
        Teglieria &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
