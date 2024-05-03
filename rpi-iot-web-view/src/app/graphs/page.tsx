'use client'

import {useEffect, useState, useRef} from "react";
import {
    Box,
    Flex,
    List,
    ListItem,
    Select,
    SimpleGrid
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {TimeSeriesChart} from "@/app/ui/TimeSeriesChart";
import {FormFieldCard} from "@/app/ui/FormFieldCard";
import SectionHeading from "@/app/ui/SectionHeading";
import {EnvironmentDataTable} from "@/app/graphs/EnvironmentDataTable";

import TimeSeries from '@/types/TimeSeries';
import EnvironmentMetrics from "@/types/EnvironmentMetrics";

// TODO: Note this endpoint has a hardcoded device id
const METRICS_ENDPOINT: string = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/devices/1/metrics`;
const PREDICTIONS_ENDPOINT: string = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/devices/1/predictions`;

function dateToDayString(date: Date): string {
    return date.toISOString().split('T')[0];
}

async function fetchMeasurements(date: string, abortController: AbortController): Promise<TimeSeries> {
    const metricsUrl = date ? `${METRICS_ENDPOINT}?date=${date}` : METRICS_ENDPOINT;

    try {
        const response = await fetch(metricsUrl, {signal: abortController.signal});
        const json = await response.json();
        const entries = json?.entries ?? [];
        return new TimeSeries(entries, date);
    } catch (error) {
        // @ts-ignore
        if(error.name === 'AbortError') {
            throw error;
        }
        console.error('Error fetching metrics data:', error);
        return new TimeSeries([], date);
    }
}

async function fetchPredictions(date: string, abortController: AbortController): Promise<TimeSeries | null> {
    const predictionsUrl = date ? `${PREDICTIONS_ENDPOINT}?date=${date}` : PREDICTIONS_ENDPOINT;

    try {
        const response = await fetch(predictionsUrl, {signal: abortController.signal});
        const json = await response.json();
        return json ? new TimeSeries(json['entries'], date) : null;
    } catch (error) {
        // @ts-ignore
        if(error.name === 'AbortError') {
            throw error;
        }

        console.error('Error fetching predictions data:', error);
        return null;
    }
}

export default function GraphsView() {
    const [date, setDate] = useState<string>(dateToDayString(new Date()));
    const [environmentMetrics, setEnvironmentMetrics] = useState<EnvironmentMetrics>(new EnvironmentMetrics());
    const [measurements, setMeasurements] = useState<TimeSeries>(new TimeSeries([], date));
    const [predictions, setPredictions] = useState<TimeSeries | null>(null);
    const [soloGraphType, setSoloGraphType] = useState<string>('');
    const dataTableRef = useRef<HTMLTableElement>(null);

    useEffect(() => {
        // ensures the table is scrolled to the top when the date changes
        if (dataTableRef.current)
            dataTableRef.current.scrollTop = 0;

        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                const measurements = await fetchMeasurements(date, abortController);
                setMeasurements(measurements);
                const predictions = await fetchPredictions(date, abortController);
                setPredictions(predictions);
            } catch(error) {
                // somewhat redundant because the fetch functions will only throw AbortErrors. They must throw the
                // AbortErrors so that we dont call the state mutators after an aborted request.
                // @ts-ignore
                if(error.name === 'AbortError')
                    console.log('Aborted fetching data for date:', date);
                else
                    console.error('An error occurred that shouldn\'t be possible', error);
            }
        }

        fetchData();

        return () => {
            abortController.abort();
        }
    }, [date]);

    // This is a little weird, but we need to wait for both the metrics and predictions to be fetched before we can
    // combine them, and if only the environmentalMetrics are fetched, we should still display them
    useEffect(() => {
        const environmentMetrics = new EnvironmentMetrics();
        environmentMetrics.combineMetrics(measurements, predictions);
        setEnvironmentMetrics(environmentMetrics);
    }, [measurements, predictions]);

    return (
        <main className="flex min-h-screen flex-col items-center p-10 border-none">
            <div className="self-start max-h-5 my-5">
                <SectionHeading>Environmental Measurements Over Time</SectionHeading>
            </div>
            <div className="w-full my-5" >
                <SimpleGrid columns={4} spacing={10}>
                    <Box w="90%" p={4}>
                        {/* This element prevents the datepicker overlay from being obscured by the FormFieldCard which has a drop shadow */}
                        <div id="date-picker-portal" className="z-50"/>
                        <FormFieldCard id={'date'} label={'Data for Date:'}>
                            <DatePicker
                                showIcon={true}
                                id='date'
                                name='date'
                                selected={new Date(date + 'T00:00:00')}
                                onChange={(date: Date | null) => setDate(dateToDayString(date ? date : new Date()))}
                                className="text-black display-block"
                                portalId={'date-picker-portal'}
                            />
                        </FormFieldCard>
                    </Box>
                    <Box w="90%" p={4}>
                        <FormFieldCard id={'device'} label={'Device:'}>
                            <Select id="device" w="100%" p="0" className="text-black p-2" icon={<Box />}> {/* This hides the icon because there is a double icon going on */}
                                <option value="rpi3B">Raspberry Pi 3b</option>
                            </Select>
                        </FormFieldCard>
                    </Box>
                    <Box w="100%" p={12}>
                        <GraphLegend/>
                    </Box>
                </SimpleGrid>
            </div>
            {!soloGraphType &&
                <div className="w-full">
                    <GraphGrid
                        onGraphClick={setSoloGraphType}
                        environmentalData={environmentMetrics}
                    />
                </div>
            }
            {soloGraphType &&
                <div>
                    <SoloGraph
                        onClose={() => setSoloGraphType('')}
                        environmentData={environmentMetrics}
                        graphType={soloGraphType}
                        onGraphClick={setSoloGraphType}
                    />
                </div>
            }
            <div className="self-start mt-5">
                <SectionHeading>All Measurements</SectionHeading>
            </div>
            <div className="mt-5 w-full">
                <EnvironmentDataTable environmentalData={environmentMetrics} ref={dataTableRef}/>
            </div>
        </main>
    );
}

type GraphGridProps = {
    onGraphClick: (soloGraphType: string) => void,
    environmentalData: EnvironmentMetrics
}

function GraphGrid(props: GraphGridProps) {
    const {environmentalData} = props;
    const metricTypes = Object.keys(EnvironmentMetrics.METRIC_TYPE_KEYS);
    return <SimpleGrid columns={metricTypes.length} spacing={0}>
        {metricTypes.map((metricType, index) => {
                return <Box w="100%" p={2} key={index} onClick={() => props.onGraphClick(metricType)}>
                    <TimeSeriesChart
                        data={environmentalData.getCombinedMetrics()}
                        xKey="t"
                        xLabel="Time of Day (UTC)"
                        yKeys={environmentalData.getDataKeysForMetricType(metricType)}
                        yLabel={EnvironmentMetrics.METRIC_TYPE_LABELS[metricType]}
                        lineColors={environmentalData.getGridColorsForMetricType(metricType)}
                        width={350}
                        height={350}
                        cursor="zoom-in"
                    />
                </Box>
            })
        }

    </SimpleGrid>;
}

type SoloGraphProps = {
    onClose: () => void,
    environmentData: EnvironmentMetrics,
    graphType: string
    onGraphClick: (soloGraphType: string) => void
}

function SoloGraph(props: SoloGraphProps) {
    const {environmentData} = props;
    return <>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('')}>
            <TimeSeriesChart
                data={environmentData.getCombinedMetrics()}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKeys={environmentData.getDataKeysForMetricType(props.graphType)}
                yLabel={EnvironmentMetrics.METRIC_TYPE_LABELS[props.graphType]}
                lineColors={environmentData.getGridColorsForMetricType(props.graphType)}
                width={750}
                height={400}
                cursor={"zoom-out"}
            />
        </Box>
    </>;
}

function GraphLegend() {
    return <Flex as="nav" align="center" justify="start" p={4} bg="gray.100">
            <List className="leading-8 pl-8">
                <ListItem>
                    <div style={{
                        display: 'inline-block',
                        width: "40px",
                        height: '1px',
                        backgroundColor: `${EnvironmentMetrics.MEASUREMENT_COLOR}`,
                        verticalAlign: "middle"
                    }}/>
                    <div className="inline-block ml-5">Actual Measurement</div>
                </ListItem>
                <ListItem>
                    <div style={{
                        display: 'inline-block',
                        width: "40px",
                        height: '1px',
                        backgroundColor: `${EnvironmentMetrics.PREDICTION_COLOR}`,
                        verticalAlign: "middle"
                    }}/>
                    <div className="inline-block ml-5">Prediction</div>
                </ListItem>
            </List>
        </Flex>;
}




