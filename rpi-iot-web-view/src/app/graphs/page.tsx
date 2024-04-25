'use client'

import {useState, useEffect} from "react";
import {Box, Center, CloseButton, Flex, Heading, IconButton, Select, SimpleGrid, Spacer} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import TimeSeries from '@/types/TimeSeries';
import {TimeSeriesChart} from "@/app/ui/TimeSeriesChart";
import {FormFieldCard} from "@/app/ui/FormFieldCard";

// TODO: Note this endpoint has a hardcoded device id
// TODO: The endpoint should also not be hardcoded
const METRICS_ENDPOINT: string = 'https://uua5w5gbl8.execute-api.us-west-1.amazonaws.com/dev/devices/1/metrics';
const PREDICTIONS_ENDPOINT: string = 'https://uua5w5gbl8.execute-api.us-west-1.amazonaws.com/dev/devices/1/predictions';

const METRIC_TYPE_KEYS: Record<string, string> = {temperature: 'tmp', humidity: 'hum', pressure: 'pr'};
const METRIC_TYPE_LABELS: Record<string, string> = {temperature: 'Temperature (in C)', humidity: 'Humidity (in %)', pressure: 'Pressure (in hPa)'};

function dateToDayString(date: Date): string {
    return date.toISOString().split('T')[0];
}

function mergePredictions(metrics: TimeSeries, predictions: TimeSeries): TimeSeries {
    if (!predictions)
        return metrics;

    if(metrics.dataPoints.length != predictions.dataPoints.length)
        console.warn("Metrics and Predictions data points do not match in length. This can cause weird behavior.");

    //TODO: Put this in TimeSeries.ts?
    const mergedDataPoints = metrics.dataPoints.map((metricDataPoint, index) => {
        // TODO: This assumes that there is data for each metric type which in reality may not be the case
        // TODO: It also assumes that the timeseries have the exact same number of entries
        const mergedRow: {[key:string]: any} = {
            ...metricDataPoint,
            ...(Object.keys(predictions.dataPoints[index]).reduce((newPrediction: {[key:string]: any}, key: string) => {
                    if(key !== 't')
                        newPrediction[`${key}Prediction`] = predictions.dataPoints[index][key];
                    return newPrediction;
                }, {}))
        };

        return mergedRow;
    });

    return new TimeSeries(mergedDataPoints, metrics.date);
}

export default function GraphsView() {
    const [date, setDate] = useState(dateToDayString(new Date()));
    const [combinedMetrics, setCombinedMetrics] = useState(new TimeSeries([], date));
    const [environmentalMetrics, setEnvironmentalMetrics] = useState(new TimeSeries([], date));
    const [environmentalPredictions, setEnvironmentalPredictions] = useState(null as unknown as TimeSeries | null);
    const [soloGraphType, setSoloGraphType] = useState('');

    useEffect(() => {
        fetch(`${METRICS_ENDPOINT}${date ? '?date=' + date : ''}`)
            .then(response => response.json())
            .then(data => setEnvironmentalMetrics(new TimeSeries(data['entries'], date)))
            .catch(error => {
                console.error('Error fetching metrics data:', error);
                setEnvironmentalMetrics(new TimeSeries([], date));
            });

        fetch(`${PREDICTIONS_ENDPOINT}${date ? '?date=' + date : ''}`)
            .then(response => response.json())
            .then(data => setEnvironmentalPredictions(new TimeSeries(data['entries'], date)))
            .catch(error => {
                console.error('Error fetching predictions data:', error);
                setEnvironmentalPredictions(null);
            });
        }, [date]);

    // This is a little weird, but we need to wait for both the metrics and predictions to be fetched before we can merge them
    // and if only the environmentalMetrics are fetched, we should still display them
    useEffect(() => {
        if(environmentalMetrics.dataPoints.length) {
            if(environmentalPredictions && environmentalPredictions.dataPoints.length)
                setCombinedMetrics(mergePredictions(environmentalMetrics, environmentalPredictions));
            else
                setCombinedMetrics(environmentalMetrics);
        } else if (environmentalPredictions && environmentalPredictions.dataPoints.length) {
            setCombinedMetrics(environmentalPredictions);
        }
    }, [environmentalMetrics, environmentalPredictions]);



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
                        environmentalData={combinedMetrics}
                   />
                }
                {soloGraphType &&
                    <SoloGraph
                        onClose={() => setSoloGraphType('')}
                        data={combinedMetrics}
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
                data={props.environmentalData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS["temperature"]}
                yLabel={METRIC_TYPE_LABELS["temperature"]}
                predictionKey={METRIC_TYPE_KEYS["temperature"] + 'Prediction'}
                width={350}
                height={350}
            />
        </Box>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('humidity')}>
            <TimeSeriesChart
                data={props.environmentalData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS["humidity"]}
                yLabel={METRIC_TYPE_LABELS["humidity"]}
                predictionKey={METRIC_TYPE_KEYS["humidity"] + 'Prediction'}
                width={350}
                height={350}
            />
        </Box>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('pressure')}>
            <TimeSeriesChart
                data={props.environmentalData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS["pressure"]}
                yLabel={METRIC_TYPE_LABELS["pressure"]}
                predictionKey={METRIC_TYPE_KEYS["pressure"] + 'Prediction'}
                width={350}
                height={350}
            />
        </Box>
    </SimpleGrid>;
}

type SoloGraphProps = {
    onClose: () => void,
    data: TimeSeries,
    predictions?: TimeSeries,
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
                data={props.data}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKey={METRIC_TYPE_KEYS[props.graphType]}
                yLabel={METRIC_TYPE_LABELS[props.graphType]}
                predictionKey={METRIC_TYPE_KEYS[props.graphType] + 'Prediction'}
                width={750}
                height={400}
            />
        </Box>
    </>;
}


