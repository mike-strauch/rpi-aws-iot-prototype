import { Inter } from "next/font/google";
import "./globals.css";
import {Box} from "@chakra-ui/react";
import SideBar from "@/app/ui/SideBar";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Box className="flex">
          <SideBar />
          <Box className="flex-1 p-10">
            {children}
          </Box>
        </Box></body>
    </html>
  );
}
