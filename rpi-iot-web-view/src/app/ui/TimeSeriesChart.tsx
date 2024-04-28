import {CartesianGrid, Label, Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import moment from "moment/moment";
import TimeSeries from "@/types/TimeSeries";

const DEFAULT_LINE_COLORS = ['#8884d8', '#82ca9d', '#ff7300', '#d6c1f4', '#ff0000', '#00ff00', '#0000ff'];

//TODO: This should allow for multiple lines on the graph by having multiple yKeys
// and then use a pre-determined list of colors to use for each line up to a max of 10?
type TimeSeriesChartProps = {
    data: TimeSeries,
    xKey: string,
    yKeys: string[],
    lineColors?: string[],
    xLabel: string,
    yLabel: string,
    height?: number,
    width?: number
};

export const TimeSeriesChart = (props: TimeSeriesChartProps) => {
    const {lineColors} = props;
    return (
        <LineChart
            width={props.width ? props.width : 450}
            height={props.height ? props.height : 450}
            data={props.data.dataPoints}
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
            {props.yKeys.map((yKey, index) => (
                <Line type="monotone"
                      dataKey={yKey}
                      stroke={lineColors && lineColors[index] ? lineColors[index] : DEFAULT_LINE_COLORS[index]}
                      dot={false}
                      key={yKey}
                />
            ))}
        </LineChart>
    );
};