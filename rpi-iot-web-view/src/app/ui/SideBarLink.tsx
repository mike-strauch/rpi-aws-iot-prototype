'use client'

import {Flex, Icon} from "@chakra-ui/react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {clsx} from "clsx";
import {IconType} from "react-icons";


type SideBarLinkProps = {
    href: string;
    icon: IconType;
    label: string;
}

export const SideBarLink = (props: SideBarLinkProps) => {
    const currentPath = usePathname();
    const {href, icon, label} = props;
    const linkClasses = clsx(['text-lg',
        'center-text',
        href !== currentPath && 'hover:text-gray-300',
        href === currentPath && ['hover:text-blue-300', 'text-blue-400']]);

    return <Link href={href} className={linkClasses}>
        <Flex align="center">
            <Icon as={icon} className="mr-2"/> {label}
        </Flex>
    </Link>;
}

export default SideBarLink;