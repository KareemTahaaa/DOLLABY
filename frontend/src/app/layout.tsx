import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Dollaby | Your Smart AI-Powered Digital Wardrobe",
  description: "Organize, style, and try-on your clothes with Dollaby, the premium fashion-tech AI SaaS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${cormorant.variable} font-sans antialiased`}>
        <Toaster position="top-center" toastOptions={{
          style: {
            borderRadius: '12px',
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid rgba(0,0,0,0.08)',
            fontFamily: 'var(--font-dm-sans)',
          }
        }} />
        {children}
      </body>
    </html>
  );
}
