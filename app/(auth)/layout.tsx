import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-black px-4 py-10 text-foreground">
      {children}
    </div>
  );
}
