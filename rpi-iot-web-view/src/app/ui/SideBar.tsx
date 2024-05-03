'use client' // Even though this component doesn't really do client-side specific stuff, in order to pass the icon component
             // to each SideBarLink (which is client-side) this component must also be marked as a client component.
import {
    Box,
    Heading,
    VStack
} from "@chakra-ui/react";
import { FaHouseChimney} from "react-icons/fa6";
import { GoGraph } from "react-icons/go";
import { PiComputerTowerLight } from "react-icons/pi";
import SideBarLink from "@/app/ui/SideBarLink";


const SideBar = () => {
    return (
        <Box className="w-64 min-h-screen p-5 bg-gray-800 text-white">
            <Heading as="h2" size="lg" className="mb-6 text-xl">
                Raspberry Pi IoT
            </Heading>
            <VStack align="stretch" spacing={5} className="ml-2">
                <SideBarLink href='/' icon={FaHouseChimney} label="Home"/>
                <SideBarLink href='/graphs' icon={GoGraph} label="Graphs"/>
                <SideBarLink href='/devices' icon={PiComputerTowerLight} label="Devices"/>
            </VStack>
        </Box>
    );
}

export default SideBar;