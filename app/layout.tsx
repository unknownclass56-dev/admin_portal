import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ADMIN_PORTAL | FACELOOK",
  description: "Secure Biometric Device Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-green-500 min-h-screen selection:bg-green-500 selection:text-black`}>
        <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="relative z-10 p-8">
          <header className="flex justify-between items-center mb-12 border-b border-green-900 pb-4">
            <h1 className="text-3xl font-mono font-bold tracking-tighter">[ FACELOOK_ADMIN_v1.0 ]</h1>
            <div className="flex gap-4 font-mono text-sm underline decoration-green-900 underline-offset-4">
              <span>SYSTEM_STATUS: ONLINE</span>
              <span>NETWORK: SECURED</span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
