const fs = require("fs");

fs.writeFileSync(
  "src/app/layout.tsx",
  `import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { TRPCReactProvider } from "~/trpc/react";
import { ChatPanel } from "~/app/_components/ChatPanel";

export const metadata: Metadata = {
  title: "Meeting Ops",
  description: "Meeting operations powered by Corsair",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={\`\${geist.variable} dark antialiased\`}>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen font-sans flex flex-col">
        <TRPCReactProvider>
          <header className="border-b border-zinc-900 bg-zinc-950 shadow-sm sticky top-0 z-10">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="font-semibold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                  <span className="h-4 w-4 bg-orange-500 rounded-sm inline-block"></span>
                  Meeting Ops
                </Link>
                <nav className="flex items-center gap-4 text-sm font-medium text-zinc-400">
                  <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
                  <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
                </nav>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> System Online
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
            {children}
          </div>
          <ChatPanel />
        </TRPCReactProvider>
      </body>
    </html>
  );
}`,
);
