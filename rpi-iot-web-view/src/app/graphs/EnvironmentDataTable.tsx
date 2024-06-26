import {Table, TableContainer, Tbody, Td, Th, Thead, Tr} from "@chakra-ui/react";
import moment from "moment";
import {forwardRef, Ref, ReactNode} from "react";
import EnvironmentMetrics from "@/types/EnvironmentMetrics";

function roundToDecimals(value: number, places: number): number {
    const factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
}

function deltaString(value1: number, value2: number, roundToPlaces: number): string {
    const delta = value2 - value1;
    return `${delta > 0 ? '+' : ''}${roundToDecimals(delta, roundToPlaces)}`;
}

type PredictedDataPointProps = {
    dataPoint: any,
    dataKey: string,
    predictionKey: string,
    unit: string
}

function PredictedDataPoint (props: PredictedDataPointProps): ReactNode {
    const {dataPoint, dataKey, predictionKey, unit} = props;
    const dataValue = dataPoint[dataKey];
    const predictionValue = dataPoint[predictionKey];
    return (
        <>
            {/*TODO: Color should come from theme or something */}
            {dataValue ? <span style={{color: '#8884d8'}}>{dataValue + ' ' + unit}</span> : ''}
            <span className="text-orange-400">
                {predictionValue ?
                    ` (${predictionValue} ${unit}${dataValue ? ', ' 
                    + deltaString(dataValue, predictionValue, 2) : ''})` : ''}
            </span>
        </>
    );
}

type EnvironmentDataTableProps = {
    environmentalData: EnvironmentMetrics
}

// Must use forwardRef to pass ref to the underlying HTMLTableElement as refs are not supported by default for function
// components. "Normally" you would use the ref inside the same component that creates the ref.
export const EnvironmentDataTable = forwardRef((props: EnvironmentDataTableProps, ref: Ref<HTMLTableElement>) => {
    const tablePaddingX = 20;
    const tablePaddingY = 10;
    const {environmentalData} = props;
    const dataSet = environmentalData.getDataSet();

    return <TableContainer ref={ref} className="mt-2 drop-shadow-md" maxHeight="500px" overflowY="auto">
        <Table variant="simple" className="" width="100%">
            <Thead className="bg-gray-500 border-b border-b-black p-3 text-white" position="sticky" zIndex="sticky" top="0">
                <Tr py={20}>
                    <Th align="left" px={tablePaddingX} py={tablePaddingY}>Time (UTC)</Th>
                    <Th align="left" px={tablePaddingX} py={tablePaddingY}>Temperature</Th>
                    <Th align="left" px={tablePaddingX} py={tablePaddingY}>Humidity</Th>
                    <Th align="left" px={tablePaddingX} py={tablePaddingY}>Pressure</Th>
                </Tr>
            </Thead>
            <Tbody>
                {dataSet.length === 0 &&
                    <Tr py={20} height={40} className="bg-blue-50">
                        <Td colSpan={4} align="center">No data available</Td>
                    </Tr>}
                {dataSet.map((dataPoint, index) => {
                    return <Tr py={20} key={dataPoint.t} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                        <Td align="left" px={tablePaddingX} py={tablePaddingY}>
                            {moment(dataPoint.t).format("hh:mm")}
                        </Td>
                        <Td align="left" px={tablePaddingX} py={tablePaddingY}>
                            <PredictedDataPoint dataPoint={dataPoint} dataKey="tmp" predictionKey="tmpPrediction" unit="°C"/>
                        </Td>
                        <Td align="left" px={tablePaddingX} py={tablePaddingY}>
                            <PredictedDataPoint dataPoint={dataPoint} dataKey="hum" predictionKey="humPrediction" unit="%"/>
                        </Td>
                        <Td align="left" px={tablePaddingX} py={tablePaddingY}>
                            <PredictedDataPoint dataPoint={dataPoint} dataKey="pr" predictionKey="prPrediction" unit="hPa"/>
                        </Td>
                    </Tr>
                })}
            </Tbody>
        </Table>
    </TableContainer>;
});

// Required for React DevTools when using a forwardRef
EnvironmentDataTable.displayName= 'EnvironmentDataTable';