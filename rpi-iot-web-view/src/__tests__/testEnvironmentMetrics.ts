import EnvironmentMetrics from "../types/EnvironmentMetrics";
import TimeSeries from "../types/TimeSeries";

test('gets correct data keys for metric type', () => {
    const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
    environmentMetrics.combinedMetrics = new TimeSeries([{}]);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual([]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1}]);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(['tmp']);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1, tmpPrediction: 2}]);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(['tmp', 'tmpPrediction']);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmpPrediction: 2}]);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(['tmpPrediction']);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1, tmpPrediction: 2, hum: 3}]);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(['tmp', 'tmpPrediction']);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.HUMIDITY_TYPE)).toEqual(['hum']);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1, tmpPrediction: 2, hum: 3, humPrediction: 4}]);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(['tmp', 'tmpPrediction']);
    expect(environmentMetrics.getDataKeysForMetricType(EnvironmentMetrics.HUMIDITY_TYPE)).toEqual(['hum', 'humPrediction']);
    expect(environmentMetrics.getDataKeysForMetricType('unknown type')).toEqual([]);
});

test('gets correct grid color for metric type', () => {
    const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
    environmentMetrics.combinedMetrics = new TimeSeries([{}]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual([]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1}]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual([EnvironmentMetrics.MEASUREMENT_COLOR]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1, tmpPrediction: 2}]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(
        [EnvironmentMetrics.MEASUREMENT_COLOR,
                  EnvironmentMetrics.PREDICTION_COLOR]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmpPrediction: 2}]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual([EnvironmentMetrics.PREDICTION_COLOR]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1, tmpPrediction: 2, hum: 3}]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(
        [EnvironmentMetrics.MEASUREMENT_COLOR,
                  EnvironmentMetrics.PREDICTION_COLOR]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.HUMIDITY_TYPE)).toEqual([EnvironmentMetrics.MEASUREMENT_COLOR]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1, tmpPrediction: 2, hum: 3, humPrediction: 4}]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.TEMPERATURE_TYPE)).toEqual(
        [EnvironmentMetrics.MEASUREMENT_COLOR,
                  EnvironmentMetrics.PREDICTION_COLOR]);
    expect(environmentMetrics.getGridColorsForMetricType(EnvironmentMetrics.HUMIDITY_TYPE)).toEqual(
        [EnvironmentMetrics.MEASUREMENT_COLOR,
                  EnvironmentMetrics.PREDICTION_COLOR]);
    expect(environmentMetrics.getGridColorsForMetricType('unknown type')).toEqual([]);
});

test('gets valid combined metrics', () => {
    const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
    const emptyTimeSeries: TimeSeries = environmentMetrics.getCombinedMetrics();
    expect(emptyTimeSeries.isEmpty()).toBe(true);
    expect(emptyTimeSeries.date).toBeNull();
    expect(emptyTimeSeries.dataPoints).toEqual([]);

    environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1}]);
    expect(environmentMetrics.getCombinedMetrics()).toEqual(new TimeSeries([{tmp: 1}]));
});

test('combines metrics into single time series', () => {
    const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
    const timeSeries1 = new TimeSeries([{tmp: 1}]);
    const timeSeries2 = new TimeSeries([{tmp: 2}]);
    environmentMetrics.combineMetrics(timeSeries1, null);
    expect(environmentMetrics.getCombinedMetrics()).toEqual(timeSeries1);

    environmentMetrics.combineMetrics(timeSeries1, new TimeSeries([]));
    expect(environmentMetrics.getCombinedMetrics()).toEqual(timeSeries1);

    environmentMetrics.combineMetrics(timeSeries1, timeSeries2);
    let combinedTimeSeries: TimeSeries = environmentMetrics.getCombinedMetrics();
    expect(combinedTimeSeries.dataPoints.length).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmp).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmpPrediction).toBe(2);

    environmentMetrics.combineMetrics(new TimeSeries([]), timeSeries2);
    combinedTimeSeries = environmentMetrics.getCombinedMetrics();
    expect(combinedTimeSeries.dataPoints.length).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmpPrediction).toBe(2);

    environmentMetrics.combineMetrics(null, timeSeries2);
    combinedTimeSeries = environmentMetrics.getCombinedMetrics();
    expect(combinedTimeSeries.dataPoints.length).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmpPrediction).toBe(2);

    timeSeries1.append({tmp: 3});
    timeSeries2.append({tmp: 4});
    environmentMetrics.combineMetrics(timeSeries1, timeSeries2);
    combinedTimeSeries = environmentMetrics.getCombinedMetrics();
    expect(combinedTimeSeries.dataPoints.length).toBe(2);
    expect(combinedTimeSeries.dataPoints[0].tmp).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmpPrediction).toBe(2);
    expect(combinedTimeSeries.dataPoints[1].tmp).toBe(3);
    expect(combinedTimeSeries.dataPoints[1].tmpPrediction).toBe(4);
});

test('combining measurements of length less than predictions truncates predictions', () => {
    const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
    const timeSeries1 = new TimeSeries([{tmp: 1}]);
    const timeSeries2 = new TimeSeries([{tmp: 2}, {tmp: 3}]);
    environmentMetrics.combineMetrics(timeSeries1, timeSeries2);
    let combinedTimeSeries: TimeSeries = environmentMetrics.getCombinedMetrics();
    expect(combinedTimeSeries.dataPoints.length).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmp).toBe(1);
    expect(combinedTimeSeries.dataPoints[0].tmpPrediction).toBe(2);
});

test('combining measurements of length greater than predictions still includes all measurements', () => {
    const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
    const timeSeries1 = new TimeSeries([{tmp: 2}, {tmp: 3}]);
    const timeSeries2 = new TimeSeries([{tmp: 1}]);
    environmentMetrics.combineMetrics(timeSeries1, timeSeries2);
    let combinedTimeSeries = environmentMetrics.getCombinedMetrics();
    expect(combinedTimeSeries.dataPoints.length).toBe(2);
    expect(combinedTimeSeries.dataPoints[0].tmp).toBe(2);
    expect(combinedTimeSeries.dataPoints[0].tmpPrediction).toBe(1);
    expect(combinedTimeSeries.dataPoints[1].tmp).toBe(3);
    expect(combinedTimeSeries.dataPoints[1].tmpPrediction).toBeUndefined();
});

test('returns correct data set', () => {
  const environmentMetrics: EnvironmentMetrics = new EnvironmentMetrics();
  expect(environmentMetrics.getDataSet()).toEqual([]);

  environmentMetrics.combinedMetrics = new TimeSeries([{tmp: 1}]);
  expect(environmentMetrics.getDataSet()).toEqual([{tmp: 1}]);
});