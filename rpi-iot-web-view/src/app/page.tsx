'use client' // required to be able to use icons in this component

import React from "react";
import {Heading, Icon, List, ListItem, UnorderedList} from "@chakra-ui/react";
import Link from "next/link";
import {PiComputerTowerLight} from "react-icons/pi";
import {GoGraph} from "react-icons/go";
import SectionHeading from "@/app/ui/SectionHeading";

export default function Home() {
  return (
      <main className="flex min-h-screen flex-col items-center p-10">
          <div className="self-start mb-8">
              <SectionHeading>Environment Monitoring and Prediction IoT Project</SectionHeading>
          </div>
          <div className="self-start w-1/2 bg-white p-6 drop-shadow-md bg-gray-300">
              <Heading as="h2" className="text-xl text-gray-700 mb-4">Visit any sub-section of this application:</Heading>
              <List className="text-lg space-y-2 ml-3" >
                  <ListItem>
                      <Link href="/graphs" className="space-x-2 text-blue-600 hover:text-blue-800">
                          <Icon as={GoGraph} className="text-2xl"/>
                          <span>Graphs</span>
                      </Link>
                  </ListItem>
                  <ListItem>
                      <Link href="/devices" className="space-x-2 text-blue-600 hover:text-blue-800 inline-block">
                          <Icon as={PiComputerTowerLight} className="text-2xl"/>
                          <span>Devices </span>
                      </Link> (in development)
                  </ListItem>
              </List>
          </div>
      </main>
  );
}
