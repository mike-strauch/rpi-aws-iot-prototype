import {CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import moment from "moment/moment";

type TimeSeriesChartProps = {
    data: ({})[],
    xKey: string,
    yKey: string,
    xLabel: string,
    yLabel: string,
    height?: number,
    width?: number
};

export const TimeSeriesChart = (props: TimeSeriesChartProps) => {
    return (
        <LineChart
            width={props.width ? props.width : 450}
            height={props.height ? props.height : 450}
            data={props.data}
            margin={{ top: 5, right: 30, left: 20, bottom: 55 }}
        >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                dataKey={props.xKey}
                tickFormatter={(tickItem) => moment(tickItem).format('h:mm a')}
            >
                {props.xLabel && <Label
                    position='insideBottom'
                    offset={-15}
                    value={props.xLabel}
                />}
            </XAxis>
            <YAxis>
                {props.yLabel && <Label
                    angle={-90}
                    position='insideLeft'
                    offset={-10}
                    value={props.yLabel}
                    dy={60}
                />}
            </YAxis>
            <Tooltip labelFormatter={(label) => moment(label).format('h:mm a')} />
            <Line type="monotone" dataKey={props.yKey} stroke="#8884d8" dot={false} />
        </LineChart>
    );
};