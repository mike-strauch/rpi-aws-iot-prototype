

export default class TimeSeries {
    dataPoints: ({[key:string]: any})[] = [];
    date?: string | null = null;

    constructor(dataPoints: ({})[], date?: string | null) {
        this.dataPoints = dataPoints;
        this.date = date;
    }

    hasKey(key: string): boolean {
        return this.dataPoints.length > 0 && this.dataPoints[0].hasOwnProperty(key);
    }

    isEmpty(): boolean {
        return this.dataPoints.length === 0;
    }
}