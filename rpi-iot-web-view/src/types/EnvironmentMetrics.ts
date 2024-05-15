import TimeSeries from "./TimeSeries";

/**
 * Encapsulates the logic for managing and combining environmental measurements and predictions
 */
export default class EnvironmentMetrics {
    combinedMetrics?: TimeSeries | null;
    static TEMPERATURE_TYPE: string = 'temperature';
    static HUMIDITY_TYPE: string = 'humidity';
    static PRESSURE_TYPE: string = 'pressure';
    static METRIC_TYPE_KEYS: Record<string, string> = {
        [EnvironmentMetrics.TEMPERATURE_TYPE]: 'tmp',
        [EnvironmentMetrics.HUMIDITY_TYPE]: 'hum',
        [EnvironmentMetrics.PRESSURE_TYPE]: 'pr'
    };
    static METRIC_TYPE_LABELS: Record<string, string> = {
        [EnvironmentMetrics.TEMPERATURE_TYPE]: 'Temperature (in C)',
        [EnvironmentMetrics.HUMIDITY_TYPE]: 'Humidity (in %)',
        [EnvironmentMetrics.PRESSURE_TYPE]: 'Pressure (in hPa)'};

    //TODO: I dont' like these here.
    static MEASUREMENT_COLOR: string= '#8884d8';
    static PREDICTION_COLOR: string = '#ff7300';

    /**
     * Gets a list of all available data keys for a particular metric. This helps when determining what data to display
     * for the given metric.
     * @param metric_type
     */
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

    /**
     * Combines the two TimeSeries objects into a single one.
     *
     * If there are measurements but no predictions, then the combined data set only contains the measurements.
     * If there are measurements and predictions, then the data is merged into a single TimeSeries object where
     * predictions have had their keys modified.
     * If there are only predictions then the prediction data is given new keys to indicate it is prediction data.
     * @param measurements
     * @param predictions
     */
    public combineMetrics(measurements: TimeSeries | null, predictions: TimeSeries | null){
        if (measurements && measurements.dataPoints.length) {
            if (predictions && !predictions.isEmpty())
                this.combinedMetrics = this.mergePredictions(measurements, predictions);
            else
                // IMPROVEMENT: Might be better to always create a new object to avoid clobbering the original data.
                this.combinedMetrics = measurements;
        } else if (predictions && !predictions.isEmpty()) {
            this.combinedMetrics = this.convertMeasurementsToPredictions(predictions);
        } else
            this.combinedMetrics = new TimeSeries([], null);
    }

    /**
     * Takes a set of metrics and predictions in TimeSeries form and consolidates them into a single TimeSeries with
     * their own unique keys in the newly created TimeSeries.
     *
     * //IMPROVEMENT: Need to figure out what actually makes sense for these scenarios. Seems like having more
     * // predictions than measurements should keep the predictions. Not sure how recharts will handle it though.
     * When measurements is shorter than predictions, predictions are truncated.
     * When measurements is longer than predictions, extra measurements are kept but no predictions are included.
     *
     * @param measurements
     * @param predictions
     * @private
     */
    private mergePredictions(measurements: TimeSeries, predictions: TimeSeries): TimeSeries {
        // IMPROVEMENT: Might be better to always return a new object to avoid clobbering the original data.
        if (!predictions)
            return measurements;

        if (measurements.dataPoints.length != predictions.dataPoints.length)
            console.warn("Metrics and Predictions data points do not match in length. " +
                "This can cause weird behavior. This can happen when looking at today's data because a full set of " +
                "predictions has been made but the day's measurements have not been completed because the day is still going");

        const mergedDataPoints = measurements.dataPoints.map((measurementDataPoint, index) => {
            // TODO: This assumes that there is data for each metric type which in reality may not be the case
            // TODO: It also assumes that the timeseries have the exact same number of entries
            const mergedRow: { [key: string]: any } = {
                ...measurementDataPoint,
                ...(index < predictions.dataPoints.length ? this.migrateToPredictionKeys(predictions.dataPoints[index]): [])
            };

            return mergedRow;
        });

        return new TimeSeries(mergedDataPoints, measurements.date);
    }

    /**
     * Migrates the data in predictionEntry so that it uses prediction keys rather than the original keys. Prediction
     * keys are essentially just the original key concatenated with 'Prediction'. The 't' key is ignored as it does not
     * correspond to a predictable value.
     * @param predictionEntry
     * @private
     */
    private migrateToPredictionKeys(predictionEntry: {[key:string]: any}): {} {
        return Object.keys(predictionEntry).reduce((newPrediction: {
            [key: string]: any
        }, key: string) => {
            if (key !== 't')
                newPrediction[`${key}Prediction`] = predictionEntry[key];
            return newPrediction;
        }, {});
    }

    /**
     * Takes the input TimeSeries and converts the schema so that it uses prediction keys rather than measurement keys.
     * @param predictions
     * @private
     */
    private convertMeasurementsToPredictions(predictions: TimeSeries) {
        return new TimeSeries(predictions.dataPoints.map((dataPoint) => {
            const combinedDataPoint: { [key: string]: any } = this.migrateToPredictionKeys(dataPoint);
            combinedDataPoint['t'] = dataPoint['t'];
            return combinedDataPoint;
        }), predictions.date);
    }
}