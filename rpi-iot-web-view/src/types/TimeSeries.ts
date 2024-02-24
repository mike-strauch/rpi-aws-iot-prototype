

export default class TimeSeries {
    dataPoints: [] = [];
    date?: string | null = null;

    constructor(dataPoints: [], date?: string | null) {
        this.dataPoints = dataPoints;
        this.date = date;
    }
}