import TimeSeries from '../types/TimeSeries';

test('time series is empty', () => {
    const timeSeries: TimeSeries = new TimeSeries([]);
    expect(timeSeries.isEmpty()).toBe(true);
});

test('time series is not empty', () => {
    const timeSeries: TimeSeries = new TimeSeries([{}]);
    expect(timeSeries.isEmpty()).toBe(false);

    const timeSeries2: TimeSeries = new TimeSeries([{key: 'value'}]);
    expect(timeSeries2.isEmpty()).toBe(false);
});

test('time series has a key', () => {
    const timeSeries: TimeSeries = new TimeSeries([{key: 'value'}]);
    expect(timeSeries.hasKey('key')).toBe(true);
});

test('time series does not have a key', () => {
    let timeSeries: TimeSeries = new TimeSeries([{key: 'value'}]);
    expect(timeSeries.hasKey('notKey')).toBe(false);

    timeSeries = new TimeSeries([]);
    expect(timeSeries.hasKey('key')).toBe(false);

    timeSeries = new TimeSeries([{key: {innerKey: 'value'}}]);
    expect(timeSeries.hasKey('innerKey')).toBe(false);
});