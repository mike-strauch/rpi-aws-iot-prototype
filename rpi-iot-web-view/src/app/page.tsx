'use client' // required to be able to use icons in this component

import React from "react";
import {Heading, Icon, ListItem, UnorderedList} from "@chakra-ui/react";
import Link from "next/link";
import {PiComputerTowerLight} from "react-icons/pi";
import {GoGraph} from "react-icons/go";

export default function Home() {
  return (
      <main className="flex min-h-screen flex-col items-center p-10 border-none">
          <div className="self-start max-h-5 mt-0">
              <Heading as="h1" className="text-2xl">Environment Monitoring and Prediction IoT Project</Heading>
          </div>
          <div className="w-full my-5">
              <Heading as="h2" className="text-xl">Visit any sub-section of this application:</Heading>
              <UnorderedList className="text-lg">
                  <ListItem><Link href="/graphs"><Icon as={GoGraph} /> Graphs</Link></ListItem>
                  <ListItem><Link href="/devices"><Icon as={PiComputerTowerLight} /> Devices (under construction)</Link></ListItem>
              </UnorderedList>
          </div>
      </main>
  );
}
