'use client'

import {ReactNode} from "react";

type DeviceViewProps = {
    params: {deviceId: string};
}

export default function DeviceView(props: DeviceViewProps): ReactNode {
    return <div>{props.params.deviceId}</div>
}