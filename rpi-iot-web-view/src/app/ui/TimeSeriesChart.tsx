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
    width?: number,
    cursor?: string
};

export const TimeSeriesChart = (props: TimeSeriesChartProps) => {
    const {lineColors, data, width, height} = props;
    if (!data.dataPoints || data.dataPoints.length === 0)
        return <div className="text-center bg-gray-300 border pt-40" style={{height: height, width: width}}>No data available</div>

    return (
        <LineChart
            width={width ? width : 450}
            height={height ? height : 450}
            data={data.dataPoints}
            margin={{ top: 5, right: 30, left: 20, bottom: 55 }}
            className="bg-gray-100 border border-gray-300 drop-shadow-md pt-10 pb-0 px-0"
            style={{cursor: props.cursor ? props.cursor : 'default'}}
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
                    offset={-5}
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