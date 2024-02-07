'use client'

import {CartesianGrid, Label, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import moment from "moment";

const data: ({ date: string; visitors: number})[] = [
    { date: '2023-01-01', visitors: 200 },
    { date: '2023-01-02', visitors: 300 },
    { date: '2023-01-03', visitors: 600 },
    { date: '2023-01-04', visitors: 800 },
    { date: '2023-01-05', visitors: 500 },
    { date: '2023-01-06', visitors: 700 },
    { date: '2023-01-07', visitors: 400 }
];

const TimeSeriesChart = ({data, xKey, yKey, xLabel, yLabel}:
     {data: ({ date: string; visitors: number})[], xKey: string, yKey: string, xLabel: string, yLabel: string}) => {
    return (
            <LineChart
                width={900}
                height={500}
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey={xKey}
                    tickFormatter={(tickItem) => moment(tickItem).format('YYYY-MM-DD')}
                >
                    {xLabel && <Label
                        position='insideBottom'
                        offset={-2}
                        value={xLabel}
                        style={{ fontSize: '80%', fill: 'white'}}
                    />}
                </XAxis>
                <YAxis label={yLabel ? yLabel : ''}/>
                <Tooltip labelFormatter={(label) => moment(label).format('YYYY-MM-DD')} />
                <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
            </LineChart>
    );
};


export default function Graphs() {
    const sortedVisitors: number[] = data.map(item => item.visitors).sort();
    const minY: number = sortedVisitors[0] - 5;
    const maxY: number = sortedVisitors[sortedVisitors.length - 1] + 5;

    return (
        <main className="flex min-h-screen flex-col items-center p-10">
            <div className="max-h-5 my-10">
                <h1>Welcome to Graphs</h1>
            </div>
            <div>
                <TimeSeriesChart data={data}
                                 xKey='date'
                                 yKey='visitors'
                                 xLabel='Date'
                                 yLabel='Number of Visitors'/>
            </div>
        </main>
    );
}