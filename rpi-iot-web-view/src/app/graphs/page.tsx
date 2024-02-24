'use client'

import {useState, useEffect} from "react";
import {Box, Center, CloseButton, Flex, Heading, IconButton, Select, SimpleGrid, Spacer} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import TimeSeries from '@/types/TimeSeries';
import {TimeSeriesChart} from "@/app/ui/TimeSeriesChart";
import {FormFieldCard} from "@/app/ui/FormFieldCard";

const DATA_ENDPOINT: string = 'https://uua5w5gbl8.execute-api.us-west-1.amazonaws.com/dev/fetch'

const METRIC_TYPE_KEYS: Record<string, string> = {temperature: 'tmp', humidity: 'hum', pressure: 'pr'};
const METRIC_TYPE_LABELS: Record<string, string> = {temperature: 'Temperature (in C)', humidity: 'Humidity (in %)', pressure: 'Pressure (in hPa)'};

function dateToDayString(date: Date): string {
    return date.toISOString().split('T')[0];
}

export default function GraphsView() {
    const [date, setDate] = useState(dateToDayString(new Date()));
    const [environmentalData, setEnvironmentalData] = useState(new TimeSeries([], date));
    const [soloGraphType, setSoloGraphType] = useState('');

    useEffect(() => {
        fetch(`${DATA_ENDPOINT}${date ? '?date=' + date : ''}`)
            .then(response => response.json())
            .then(data => setEnvironmentalData(new TimeSeries(data['entries'], date)))
            .catch(error => {
                console.error('Error fetching data:', error);
                setEnvironmentalData(new TimeSeries([], date));
            });
        }, [date]);

    return (
        <main className="flex min-h-screen flex-col items-center p-10">
            <div className="max-h-5 my-10">
                <Heading as='h1' size='4xl' noOfLines={1}>
                    Environmental Measurements Over Time
                </Heading>
            </div>
            <div>
                {!soloGraphType &&
                    <GraphGrid
                        onGraphClick={setSoloGraphType}
                        environmentalData={environmentalData}
                   />
                }
                {soloGraphType &&
                    <SoloGraph
                        onClose={() => setSoloGraphType('')}
                        data={environmentalData}
                        graphType={soloGraphType}
                    />
                }
            </div>
            <div className="mt-10">
                <SimpleGrid columns={2} spacing={10}>
                    <Box w="75%" p={4} >
                        <FormFieldCard id={'date'} label={'Data for Date:'}>
                            <DatePicker
                                showIcon={true}
                                id='date'
                                name='date'
                                selected={new Date(date + 'T00:00:00')}
                                onChange={(date: Date | null) => setDate(dateToDayString(date ? date : new Date()))}
                                className="text-black"
                            />
                        </FormFieldCard>
                    </Box>
                    <Box w="75%" p={4} >
                        <FormFieldCard id={'device'} label={'Device:'}>
                            <Select id="device" w="100%" p={4} className="text-black">
                                <option value="rpi3B">Raspberry Pi 3b</option>
                            </Select>
                        </FormFieldCard>
                    </Box>
                </SimpleGrid>
            </div>
        </main>
    );
}

type GraphGridProps = {
    onGraphClick: (soloGraphType: string) => void,
    environmentalData: TimeSeries
}

function GraphGrid(props: GraphGridProps) {
    return <SimpleGrid columns={3} spacing={10}>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('temperature')}>
            <TimeSeriesChart
                data={props.environmentalData.dataPoints}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS["temperature"]}
                yLabel={METRIC_TYPE_LABELS["temperature"]}
                width={350}
                height={350}
            />
        </Box>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('humidity')}>
            <TimeSeriesChart
                data={props.environmentalData.dataPoints}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS["humidity"]}
                yLabel={METRIC_TYPE_LABELS["humidity"]}
                width={350}
                height={350}
            />
        </Box>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('pressure')}>
            <TimeSeriesChart
                data={props.environmentalData.dataPoints}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS["pressure"]}
                yLabel={METRIC_TYPE_LABELS["pressure"]}
                width={350}
                height={350}
            />
        </Box>
    </SimpleGrid>;
}

type SoloGraphProps = {
    onClose: () => void,
    data: TimeSeries,
    graphType: string
}

function SoloGraph(props: SoloGraphProps) {

    return <>
        <Center>
            <div className="my-0">
                <Heading as='h2' size='2xl' noOfLines={1}>
                    {METRIC_TYPE_LABELS[props.graphType]} for {props.data.date}
                </Heading>
            </div>
        </Center>
        <Box w="100%" p={4}>
            <Flex>
                <Spacer/>
                <Box p="4">
                    <IconButton
                        aria-label="Back to All Graphs"
                        icon={<CloseButton/>}
                        variant="solid"
                        onClick={props.onClose}/>
                </Box>
            </Flex>
            <TimeSeriesChart
                data={props.data.dataPoints}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS[props.graphType]}
                yLabel={METRIC_TYPE_LABELS[props.graphType]}
                width={750}
                height={400}
            />
        </Box>
    </>;
}


