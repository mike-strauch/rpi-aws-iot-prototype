import TimeSeries from "@/types/TimeSeries";


/**
 * Encapsulates the logic for managing and combining environmental measurements and predictions
 */
export default class EnvironmentMetrics {
    combinedMetrics?: TimeSeries | null;
    static METRIC_TYPE_KEYS: Record<string, string> = {temperature: 'tmp', humidity: 'hum', pressure: 'pr'};
    static METRIC_TYPE_LABELS: Record<string, string> = {temperature: 'Temperature (in C)', humidity: 'Humidity (in %)', pressure: 'Pressure (in hPa)'};
    static MEASUREMENT_COLOR: string= '#8884d8';
    static PREDICTION_COLOR: string = '#ff7300';

    public getDataKeysForMetricType(metric_type: string): string[] {
        const keys: string[] = [];
        if(!this.combinedMetrics)
            return [];

        if(this.combinedMetrics.hasKey((EnvironmentMetrics.METRIC_TYPE_KEYS)[metric_type]))
            keys.push(EnvironmentMetrics.METRIC_TYPE_KEYS[metric_type]);

        const predictionKey: string = EnvironmentMetrics.METRIC_TYPE_KEYS[metric_type] + 'Prediction';
        if(this.combinedMetrics.hasKey(predictionKey))
            keys.push(predictionKey);

        return keys;
    }

    //IMPROVEMENT: A little weird to be determining colors in this object, but it's convenient for now.
    public getGridColorsForMetricType(metric_type: string): string[] {
        const colors: string[] = [];
        if(!this.combinedMetrics)
            return [];

        if(this.combinedMetrics.hasKey(EnvironmentMetrics.METRIC_TYPE_KEYS[metric_type]))
            colors.push(EnvironmentMetrics.MEASUREMENT_COLOR);
        if(this.combinedMetrics.hasKey(EnvironmentMetrics.METRIC_TYPE_KEYS[metric_type] + 'Prediction'))
            colors.push(EnvironmentMetrics.PREDICTION_COLOR);

        return colors;
    }

    public getCombinedMetrics(): TimeSeries {
        return this.combinedMetrics || new TimeSeries([], null);
    }

    public getDataSet(): {[key: string]: any}[] {
        return this.combinedMetrics ? this.combinedMetrics.dataPoints : [];
    }

    public combineMetrics(measurements: TimeSeries, predictions: TimeSeries | null){
        if (measurements.dataPoints.length) {
            if (predictions && !predictions.isEmpty())
                this.combinedMetrics = this.mergePredictions(measurements, predictions);
            else
                this.combinedMetrics = measurements;
        } else if (predictions && !predictions.isEmpty()) {
            this.combinedMetrics = this.convertMeasurementsToPredictions(predictions);
        } else
            this.combinedMetrics = new TimeSeries([], null);
    }

    /**
     * Takes a set of metrics and predictions in TimeSeries form and consolidates them into a single TimeSeries with
     * their own unique keys in the newly created TimeSeries.
     * @param metrics
     * @param predictions
     * @private
     */
    private mergePredictions(metrics: TimeSeries, predictions: TimeSeries): TimeSeries {
        if (!predictions)
            return metrics;

        if (metrics.dataPoints.length != predictions.dataPoints.length)
            console.warn("Metrics and Predictions data points do not match in length. " +
                "This can cause weird behavior. This can happen when looking at today's data because a full set of " +
                "predictions has been made but the day's measurements have not been completed because the day is still going");

        const mergedDataPoints = metrics.dataPoints.map((metricDataPoint, index) => {
            // TODO: This assumes that there is data for each metric type which in reality may not be the case
            // TODO: It also assumes that the timeseries have the exact same number of entries
            const mergedRow: { [key: string]: any } = {
                ...metricDataPoint,
                ...(Object.keys(predictions.dataPoints[index]).reduce((newPrediction: {
                    [key: string]: any
                }, key: string) => {
                    if (key !== 't')
                        newPrediction[`${key}Prediction`] = predictions.dataPoints[index][key];
                    return newPrediction;
                }, {}))
            };

            return mergedRow;
        });

        return new TimeSeries(mergedDataPoints, metrics.date);
    }

    /**
     * Takes the input data and coverts it over to "predictions" but migrating the key of each data point appropriately
     * so that it can be displayed properly in the UI.
     * @param environmentalPredictions
     * @private
     */
    private convertMeasurementsToPredictions(environmentalPredictions: TimeSeries) {
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
}