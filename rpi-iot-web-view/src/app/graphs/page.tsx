'use client'

import {CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import moment from "moment";
import {useState, useEffect} from "react";
import TimeSeries from '../../types/TimeSeries';
import {Box, SimpleGrid} from "@chakra-ui/react";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

const DATA_ENDPOINT: string = 'https://uua5w5gbl8.execute-api.us-west-1.amazonaws.com/dev/fetch'

const TimeSeriesChart = ({data, xKey, yKey, xLabel, yLabel}:
     {data: ({})[], xKey: string, yKey: string, xLabel: string, yLabel: string}) => {
    return (
            <LineChart
                width={900}
                height={400}
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 55 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey={xKey}
                    tickFormatter={(tickItem) => moment(tickItem).format('h:mm a')}
                >
                    {xLabel && <Label
                        position='insideBottom'
                        offset={-15}
                        value={xLabel}
                    />}
                </XAxis>
                <YAxis>
                    {yLabel && <Label
                        angle={-90}
                        position='insideLeft'
                        offset={-10}
                        value={yLabel}
                    />}
                </YAxis>
                <Tooltip labelFormatter={(label) => moment(label).format('h:mm a')} />
                <Line type="monotone" dataKey={yKey} stroke="#8884d8" dot={false} />
            </LineChart>
    );
};


export default function Graphs() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [environmentalData, setEnvironmentalData] = useState(new TimeSeries([]));
    useEffect(() => {
        fetch(`${DATA_ENDPOINT}${date ? '?date=' + date : ''}`)
            .then(response => response.json())
            .then(data => setEnvironmentalData(new TimeSeries(data['entries'])))
            .catch(error => console.error('Error fetching data:', error));
        }, [date]);

    return (
        <main className="flex min-h-screen flex-col items-center p-10">
            <div className="max-h-5 my-10">
                <h1>Welcome to Graphs</h1>
            </div>
            <div>
                <TimeSeriesChart data={environmentalData.dataPoints}
                                 xKey='t'
                                 yKey='tmp'
                                 xLabel='Time of Day (UTC)'
                                 yLabel='Temperature (in C)'/>
            </div>
            <div>
                <SimpleGrid columns={3} spacing={10}>
                    <Box w="90%" p={4} >
                        <div className="bg-slate-500 border-solid rounded-lg border-2 border-gray-200 p-4 text-white">
                            <label htmlFor="date" className="mb-2 inline-block">Show data for:</label>
                            <DatePicker
                                showIcon={true}
                                name='date'
                                selected={new Date(date)}
                                onChange={(date) => setDate(date != null ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])}
                                className="text-black"
                            />
                        </div>
                    </Box>
                    <Box></Box>
                </SimpleGrid>
            </div>
        </main>
    );
}