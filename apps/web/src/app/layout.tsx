import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { zh } from "../copy/zh";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: zh.meta.title,
  description: zh.meta.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
