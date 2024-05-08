'use client'

import {ReactNode, useEffect, useState} from "react";
import {Flex, Icon, Table, TableContainer, Tbody, Td, Th, Thead, Tr} from "@chakra-ui/react";
import Link from "next/link";
import SectionHeading from "@/app/ui/SectionHeading";

export default function DevicesView(): ReactNode {
    const [devices, setDevices] = useState<Device[]>([]);
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/devices`);
                const responseJson = await response.json();
                setDevices(responseJson['devices'] || []);
            } catch(e) {
                console.error(e);
            }
        }

        fetchDevices();
    }, []);

    return (
        <main className="flex flex-col items-center justify-between p-10 border-none">
            <div className="self-start max-h-5 mb-5 mt-0">
              <SectionHeading>Devices</SectionHeading>
            </div>
            <div className="mt-5 w-96 md:w-full">
                <DeviceTable devices={devices}/>
            </div>
        </main>
    );
}

type Device = {
    name: string,
    type: string,
    version: string
}

type DeviceTableProps = {
    devices: Device[]
}

const FAKE_DEVICES: Device[] = [{name: "Raspberry Pi 4", type: "Single Board Computer", version: "1.0.0"},
    {name: "Arduino Uno", type: "Microcontroller", version: "1.0.0"},
    {name: "ESP32", type: "Microcontroller", version: "1.0.0"},
    {name: "Raspberry Pi Zero", type: "Single Board Computer", version: "1.0.0"}];

function DeviceTable(props: DeviceTableProps): ReactNode {
    const {devices} = props;
    const paddingX = 10;
    const paddingY = 8;
    return <TableContainer className="mt-2 drop-shadow-md" maxHeight="700px" overflowY="auto">
            <Table variant="simple" width="100%">
                <Thead className="bg-gray-500 border-b border-b-black p-3 text-white">
                    <Tr>
                        <Th px={paddingX} py={paddingY} align="left">Name</Th>
                        <Th px={paddingX} py={paddingY} align="left">Type</Th>
                        <Th px={paddingX} py={paddingY} align="left">Version</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {!devices || devices.length === 0 && <Tr><Th colSpan={3}>No devices found</Th></Tr>}
                    {devices && devices.map((device, index) => (
                        <Tr key={index} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                            <Td py={paddingY} px={paddingX}><Link href={`/devices/${device.name}`}>{device.name}</Link></Td>
                            <Td py={paddingY} px={paddingX}>{device.type}</Td>
                            <Td py={paddingY} px={paddingX}>{device.version}</Td>
                        </Tr>
                    ))}
                    {FAKE_DEVICES.map((device, index) => (
                        <Tr key={index} className={index % 2 !== 0 ? "bg-blue-50" : "bg-white"}>
                            <Td py={paddingY} px={paddingX}><Link href={`/devices/${device.name}`}>{device.name}</Link></Td>
                            <Td py={paddingY} px={paddingX}>{device.type}</Td>
                            <Td py={paddingY} px={paddingX}>{device.version}</Td>
                        </Tr>))
                    }
                </Tbody>
            </Table>
        </TableContainer>
}