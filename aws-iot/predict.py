try:
    import unzip_requirements
except ImportError:
    pass

import boto3
import datetime
import os
import time
import logging
import json
from io import StringIO
import pandas as pd

from data_store import load_file_as_string, append_data_as_json

log = logging.getLogger()
log.setLevel(logging.INFO)
S3_BUCKET = os.getenv("S3_BUCKET")
MODELS_PATH = os.getenv("MODELS_PATH")
MODEL_TYPES = ['temperature', 'humidity', 'pressure']


def deploy_models(event, context):
    try:
        _create_models()
        _create_endpoint_configs()
        endpoints = _create_endpoints()
        return endpoints
    except Exception as e:
        log.error(f"An error occurred while deploying models: {e}")
        raise e


def _create_models():
    for model_type in MODEL_TYPES:
        _create_model(model_type)


def _create_model(model_type):
    log.info(f'Creating model for type: {model_type}')
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    model_name = f'{date_today}-{model_type}-model'
    model_file_key = f'{model_name}.tar.gz'

    log.info(f'Path to model files: s3://{S3_BUCKET}/{MODELS_PATH}/{model_file_key}')

    sagemaker = boto3.client('sagemaker')
    sagemaker.create_model(
        ModelName=model_name,
        PrimaryContainer={
            'Image': '746614075791.dkr.ecr.us-west-1.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3',
            'ModelDataUrl': f's3://{S3_BUCKET}/{MODELS_PATH}/{model_file_key}',
            'Environment': {
                'MODEL_FILE_NAME': f'{model_name}.pkl',
                'SAGEMAKER_PROGRAM': 'script.py',
                'SAGEMAKER_REGION': 'us-west-1',
                'SAGEMAKER_SUBMIT_DIRECTORY': f's3://{S3_BUCKET}/{MODELS_PATH}/{model_file_key}'
            }
        },

        # TODO Update to use env variable?
        ExecutionRoleArn='arn:aws:iam::904381544143:role/rpi-aws-iot-prototype-dev-us-west-1-lambdaRole'
    )
    log.info(f"Model created: {model_name}")


def _create_endpoint_configs():
    for model_type in MODEL_TYPES:
        _create_endpoint_config(model_type)


def _create_endpoint_config(model_type):
    log.info(f'Creating endpoint config for {model_type}')
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    endpoint_config_name = f'{date_today}-{model_type}-endpoint-config'
    model_name = f'{date_today}-{model_type}-model'

    sagemaker = boto3.client('sagemaker')
    sagemaker.create_endpoint_config(
        EndpointConfigName=endpoint_config_name,
        ProductionVariants=[
            {
                'VariantName': 'AllTraffic',
                'ModelName': model_name,
                'InstanceType': 'ml.m5.large',
                'InitialInstanceCount': 1,
            },
        ]
    )

    log.info(f"Endpoint config created: {endpoint_config_name}")


def _create_endpoints():
    temp_endpoint_name = _create_endpoint('temperature')
    humidity_endpoint_name = _create_endpoint('humidity')
    pressure_endpoint_name = _create_endpoint('pressure')

    if (not _wait_for_endpoint_creation(temp_endpoint_name)
            or not _wait_for_endpoint_creation(humidity_endpoint_name)
            or not _wait_for_endpoint_creation(pressure_endpoint_name)):
        raise Exception("Endpoint creation failed.")

    return {
        'temperature-endpoint': temp_endpoint_name,
        'humidity-endpoint': humidity_endpoint_name,
        'pressure-endpoint': pressure_endpoint_name
    }


def _create_endpoint(model_type):
    log.info(f'Creating endpoint for {model_type}')
    sagemaker = boto3.client('sagemaker')
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    model_name = f'{date_today}-{model_type}-model'
    endpoint_config_name = f'{date_today}-{model_type}-endpoint-config'
    endpoint_name = f'{model_name}-endpoint'

    sagemaker.create_endpoint(
        EndpointName=endpoint_name,
        EndpointConfigName=endpoint_config_name
    )

    log.info(f"Endpoint {endpoint_name} created, waiting for successful startup")
    return endpoint_name


def _wait_for_endpoint_creation(endpoint_name):
    sagemaker = boto3.client('sagemaker')
    tries = 10

    log.info(f"Waiting for endpoint creation to complete for endpoint: {endpoint_name}")

    while True and tries > 0:
        response = sagemaker.describe_endpoint(EndpointName=endpoint_name)
        status = response['EndpointStatus']
        log.info(f"Endpoint status for {endpoint_name}: {status}")

        if status == 'InService':
            log.info(f"Endpoint {endpoint_name} is in service.")
            return True
        elif status == 'Failed':
            failure_reason = response.get('FailureReason', 'Unknown failure reason.')
            log.info(f"Endpoint creation failed. Failure reason: {failure_reason}")
            return False
        elif status != 'Creating':
            log.info(f"Status was not 'Pending' or any other recognized statuses: {status}")
            break

        time.sleep(30)
        tries -= 1

    log.info(f"Endpoint creation did not complete within the expected time frame for endpoint: {endpoint_name}")
    return False


def predict_daily_atmospheric_metrics(event, context):
    if 'aggregateFileKey' not in event:
        raise ValueError('No aggregate file key was provided, aborting')
    if 'endpoints' not in event:
        raise ValueError('No model endpoint names were provided, aborting')

    aggregate_data = load_file_as_string(event['aggregateFileKey'])
    aggregate_data_df = pd.read_csv(StringIO(aggregate_data))
    metric_averages_by_time_of_day = _get_averages_by_time_of_day(aggregate_data_df)

    for i in range(7):
        log.info(f"Predicting atmospheric metrics for day {i}")
        predictions_for_day = []
        timestamp_today_offset_by_days = int(datetime.datetime.now().timestamp()) + (i * 24 * 60 * 60)

        #  IMPROVEMENT: I can send a whole day's worth of predictions in one request by sending a 2D array of data
        #  instead of sending a request for each 10 minute interval.
        seconds_per_day = 24 * 60 * 60
        seconds_per_10_min = 10 * 60
        for time_of_day_seconds in range(0, seconds_per_day, seconds_per_10_min):  # seconds / day, seconds / 10 minutes
            prediction_for_time = {}
            prediction_for_time['t'] = (timestamp_today_offset_by_days + time_of_day_seconds) * 1000

            prediction_for_time['tmp'] = round((
                _predict_metric_for_day_and_time(
                    metric_averages_by_time_of_day, 'temperature', i, time_of_day_seconds, event)), 2)

            prediction_for_time['hum'] = round((
                _predict_metric_for_day_and_time(
                    metric_averages_by_time_of_day, 'humidity', i, time_of_day_seconds, event)), 2)

            prediction_for_time['pr'] = round((
                _predict_metric_for_day_and_time(
                    metric_averages_by_time_of_day, 'pressure', i, time_of_day_seconds, event)), 2)

            predictions_for_day.append(prediction_for_time)

        date_today_plus_offset = (datetime.datetime.now() + datetime.timedelta(days=i)).strftime('%Y-%m-%d')
        _store_predictions_for_day(predictions_for_day, date_today_plus_offset)


def _predict_metric_for_day_and_time(metric_averages, metric_type, day, time_of_day, event):
    endpoint_name = _get_endpoint_name(event, metric_type)
    feature_types = MODEL_TYPES.copy()
    feature_types.remove(metric_type)

    averages_for_time_of_day = metric_averages.loc[time_of_day]
    feature_data = [time_of_day,
                    averages_for_time_of_day[feature_types[0]],
                    averages_for_time_of_day[feature_types[1]],
                    False, False, False, False, False, False, False]  # fill in values for one-hot encoded days of week
    feature_data[day + 3] = True

    data = {
        "features": feature_data
    }

    payload = json.dumps(data)
    sagemaker = boto3.client('sagemaker-runtime', region_name='us-west-1')
    response = sagemaker.invoke_endpoint(
        EndpointName=endpoint_name,
        ContentType='application/json',
        Body=payload
    )
    predicted_value = json.loads(response['Body'].read().decode('utf-8'))[0]
    return predicted_value


# Note that this changes the data in the data frame, specifically it updates time_of_day so that the values are
# truncated
def _get_averages_by_time_of_day(aggregate_data_df):
    log.info("Creating metric averages by time of day")
    # Truncate the time of day to the nearest 100 seconds so that readings that come in at slightly different times
    # can still be averaged together to generate prediction feature values
    aggregate_data_df['time_of_day'] = (aggregate_data_df['time_of_day'] // 100) * 100
    return aggregate_data_df.groupby(['time_of_day']).agg({
        'temperature': 'mean',
        'pressure': 'mean',
        'humidity': 'mean'
    })


def _store_predictions_for_day(predictions, date):
    file_key = f'{date}-predictions'
    log.info(f'Saving {len(predictions)} predictions to file with key {file_key}')
    try:
        append_data_as_json(predictions, file_key)
    except Exception as e:
        log.error(f"An error occurred while storing predictions in file with key {file_key}: {e}")


def _get_endpoint_name(event, model_type):
    return event['endpoints'][f'{model_type}-endpoint']
