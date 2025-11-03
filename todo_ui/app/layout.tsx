import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/Providers/SessionProviderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: "Todo — AI Study Scheduler",
  description:
    "Let AI understand your workload and create the perfect study schedule. Chat naturally and get a calendar in seconds.",
  keywords: [
    "study scheduler",
    "ai study planner",
    "calendar",
    "tasks",
    "students",
  ],
  authors: [{ name: "Todo" }],
  creator: "Todo",
  publisher: "Todo",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    title: "Todo — AI Study Scheduler",
    description:
      "Let AI understand your workload and create the perfect study schedule.",
    siteName: "Todo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Todo — AI Study Scheduler",
    description:
      "Let AI understand your workload and create the perfect study schedule.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
