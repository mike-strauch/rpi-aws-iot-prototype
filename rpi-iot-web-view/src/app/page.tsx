import React from "react";
import {Heading} from "@chakra-ui/react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-10 border-none">
      <div>
        <Heading as="h1" className="text-2xl">Welcome to Raspberry Pi IoT Project</Heading>
      </div>
    </main>
  );
}
