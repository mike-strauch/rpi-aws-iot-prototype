'use client'

import {useEffect, useState} from "react";
import {
    Box,
    Center,
    CloseButton,
    Flex,
    Heading,
    IconButton,
    List,
    ListItem,
    Select,
    SimpleGrid,
    Spacer
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import TimeSeries from '@/types/TimeSeries';
import {TimeSeriesChart} from "@/app/ui/TimeSeriesChart";
import {FormFieldCard} from "@/app/ui/FormFieldCard";
import SectionHeading from "@/app/ui/SectionHeading";
import {EnvironmentDataTable} from "@/app/graphs/EnvironmentDataTable";

// TODO: Note this endpoint has a hardcoded device id
// TODO: The endpoint should also not be hardcoded
const METRICS_ENDPOINT: string = 'https://uua5w5gbl8.execute-api.us-west-1.amazonaws.com/dev/devices/1/metrics';
const PREDICTIONS_ENDPOINT: string = 'https://uua5w5gbl8.execute-api.us-west-1.amazonaws.com/dev/devices/1/predictions';

const METRIC_TYPE_KEYS: Record<string, string> = {temperature: 'tmp', humidity: 'hum', pressure: 'pr'};
const METRIC_TYPE_LABELS: Record<string, string> = {temperature: 'Temperature (in C)', humidity: 'Humidity (in %)', pressure: 'Pressure (in hPa)'};
const MEASUREMENT_COLOR: string= '#8884d8';
const PREDICTION_COLOR: string = '#ff7300';

function dateToDayString(date: Date): string {
    return date.toISOString().split('T')[0];
}

function getGridColorsForMetricType(environmentalData: TimeSeries, metric_type: string): string[] {
    const colors: string[] = [];
    if(environmentalData.hasKey(METRIC_TYPE_KEYS[metric_type]))
        colors.push(MEASUREMENT_COLOR);
    if(environmentalData.hasKey(METRIC_TYPE_KEYS[metric_type] + 'Prediction'))
        colors.push(PREDICTION_COLOR);

    return colors;
}

function getDataKeysForMetricType(environmentalData: TimeSeries, metric_type: string): string[] {
    const keys: string[] = [];
    if(environmentalData.hasKey(METRIC_TYPE_KEYS[metric_type]))
        keys.push(METRIC_TYPE_KEYS[metric_type]);

    const predictionKey: string = METRIC_TYPE_KEYS[metric_type] + 'Prediction';
    if(environmentalData.hasKey(predictionKey))
        keys.push(predictionKey);

    return keys;
}

function getCombinedMetrics(environmentalMetrics: TimeSeries, environmentalPredictions: TimeSeries | null): TimeSeries {
    if(environmentalMetrics.dataPoints.length) {
        if(environmentalPredictions && !environmentalPredictions.isEmpty())
            return mergePredictions(environmentalMetrics, environmentalPredictions);
        else
            return environmentalMetrics;
    } else if (environmentalPredictions && !environmentalPredictions.isEmpty()) {
        return new TimeSeries(environmentalPredictions.dataPoints.map((dataPoint) => {
            const combinedDataPoint: { [key: string]: any } = {};
            Object.keys(dataPoint).forEach((key) => {
                if (key === 't')
                    combinedDataPoint[key] = dataPoint[key];
                else
                    combinedDataPoint[`${key}Prediction`] = dataPoint[key];
            });
            return combinedDataPoint;
        }), environmentalPredictions.date);
    }

    return new TimeSeries([], null);
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
        //TODO: This doesn't handle canceling the fetch if the component is unmounted
        fetch(`${METRICS_ENDPOINT}${date ? '?date=' + date : ''}`)
            .then(response => response.json())
            .then(data => setEnvironmentalMetrics(data ? new TimeSeries(data['entries'], date) : new TimeSeries([], date)))
            .catch(error => {
                console.error('Error fetching metrics data:', error);
                setEnvironmentalMetrics(new TimeSeries([], date));
            });

        fetch(`${PREDICTIONS_ENDPOINT}${date ? '?date=' + date : ''}`)
            .then(response => response.json())
            .then(data => setEnvironmentalPredictions(data ? new TimeSeries(data['entries'], date) : null))
            .catch(error => {
                console.error('Error fetching predictions data:', error);
                setEnvironmentalPredictions(null);
            });
        }, [date]);

    // This is a little weird, but we need to wait for both the metrics and predictions to be fetched before we can merge them
    // and if only the environmentalMetrics are fetched, we should still display them
    useEffect(() => {
        const combinedMetrics = getCombinedMetrics(environmentalMetrics, environmentalPredictions);
        setCombinedMetrics(combinedMetrics);
    }, [environmentalMetrics, environmentalPredictions]);

    return (
        <main className="flex min-h-screen flex-col items-center p-10 border-none">
            <div className="self-start max-h-5 my-5">
                <SectionHeading>Environmental Measurements Over Time</SectionHeading>
            </div>
            <div className="w-full mt-5 mb-10" >
                <SimpleGrid columns={4} spacing={10}>
                    <Box w="90%" p={4}>
                        <FormFieldCard id={'date'} label={'Data for Date:'}>
                            <DatePicker
                                showIcon={true}
                                id='date'
                                name='date'
                                selected={new Date(date + 'T00:00:00')}
                                onChange={(date: Date | null) => setDate(dateToDayString(date ? date : new Date()))}
                                className="text-black display-block"
                            />
                        </FormFieldCard>
                    </Box>
                    <Box w="90%" p={4}>
                        <FormFieldCard id={'device'} label={'Device:'}>
                            <Select id="device" w="100%" p="0" className="text-black p-2">
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
                        environmentalData={combinedMetrics}
                    />
                </div>
            }
            {soloGraphType &&
                <div>
                    <SoloGraph
                        onClose={() => setSoloGraphType('')}
                        environmentData={combinedMetrics}
                        graphType={soloGraphType}
                    />
                </div>
            }
            <div className="self-start mt-5">
                <SectionHeading>All Measurements</SectionHeading>
            </div>
            <div className="mt-5 w-full">
                <EnvironmentDataTable environmentalData={combinedMetrics}/>
            </div>
        </main>
    );
}

type GraphGridProps = {
    onGraphClick: (soloGraphType: string) => void,
    environmentalData: TimeSeries
}

function GraphGrid(props: GraphGridProps) {
    const {environmentalData} = props;
    return <SimpleGrid columns={3} spacing={10}>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('temperature')}>
            <TimeSeriesChart
                data={props.environmentalData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKeys={getDataKeysForMetricType(environmentalData, "temperature")}
                yLabel={METRIC_TYPE_LABELS["temperature"]}
                lineColors={getGridColorsForMetricType(environmentalData, "temperature")}
                width={350}
                height={350}
            />
        </Box>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('humidity')}>
            <TimeSeriesChart
                data={props.environmentalData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKeys={getDataKeysForMetricType(environmentalData, "humidity")}
                yLabel={METRIC_TYPE_LABELS["humidity"]}
                lineColors={getGridColorsForMetricType(environmentalData, "humidity")}
                width={350}
                height={350}
            />
        </Box>
        <Box w="100%" p={4} onClick={() => props.onGraphClick('pressure')}>
            <TimeSeriesChart
                data={props.environmentalData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKeys={getDataKeysForMetricType(environmentalData, "pressure")}
                yLabel={METRIC_TYPE_LABELS["pressure"]}
                lineColors={getGridColorsForMetricType(environmentalData, "pressure")}
                width={350}
                height={350}
            />
        </Box>
    </SimpleGrid>;
}

type SoloGraphProps = {
    onClose: () => void,
    environmentData: TimeSeries,
    graphType: string
}

function SoloGraph(props: SoloGraphProps) {
    const {environmentData} = props;
    return <>
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
                data={environmentData}
                xKey="t"
                xLabel="Time of Day (UTC)"
                yKeys={getDataKeysForMetricType(environmentData, props.graphType)}
                yLabel={METRIC_TYPE_LABELS[props.graphType]}
                lineColors={getGridColorsForMetricType(environmentData, props.graphType)}
                width={750}
                height={400}
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
                        backgroundColor: `${MEASUREMENT_COLOR}`,
                        verticalAlign: "middle"
                    }}/>
                    <div className="inline-block ml-5">Actual Measurement</div>
                </ListItem>
                <ListItem>
                    <div style={{
                        display: 'inline-block',
                        width: "40px",
                        height: '1px',
                        backgroundColor: `${PREDICTION_COLOR}`,
                        verticalAlign: "middle"
                    }}/>
                    <div className="inline-block ml-5">Prediction</div>
                </ListItem>
            </List>
        </Flex>;
}




