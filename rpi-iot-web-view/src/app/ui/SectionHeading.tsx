import {Heading} from "@chakra-ui/react";
import React from "react";

const SectionHeading = (props: { children: React.ReactNode }) => {
    return (
        <Heading as='h1' className="text-2xl border-b-2 border-b-gray-400" noOfLines={1}>
            {props.children}
        </Heading>
    );
}

export default SectionHeading;