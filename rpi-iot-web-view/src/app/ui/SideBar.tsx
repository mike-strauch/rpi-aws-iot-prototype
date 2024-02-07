'use client'

import {usePathname} from "next/navigation";
import {clsx} from "clsx";
import {
    Box,
    Heading,
    Link,
    VStack
} from "@chakra-ui/react";

const SideBar = () => {
    const path: string = usePathname();
    return (
        <Box className="w-64 h-screen p-5 bg-gray-800 text-white border-r-2 border-white">
            <Heading as="h2" size="lg" className="mb-6">
                Raspberry Pi IoT Sensors
            </Heading>
            <VStack align="stretch" spacing={3}>
                <Link href="/" className={clsx('hover:text-gray-300', {'text-blue': path === '/'})}>Home</Link>
                <Link href="/graphs" className={clsx("hover:text-gray-300", {'text-blue': path === '/graphs'})}>Graphs</Link>
            </VStack>
        </Box>
    );
}

export default SideBar;