import boto3
import logging
import datetime
import io
import csv
import time

from data_store import load_datafile_as_json, store_file

log = logging.getLogger()
s3 = boto3.client('s3')


def generate_csv_from_daily_data(event, context):
    log.info("Aggregating data from the last 30 days.")
    today = datetime.datetime.now()
    csv_output = _convert_daily_reports_to_csv(today)
    aggregated_data_file_key = _get_dataset_path()
    _upload_csv_to_s3(csv_output, aggregated_data_file_key)
    return {
        'aggregateFileKey': aggregated_data_file_key
    }


# Finds the last 30 days of data and aggregates it into a single CSV file
def _convert_daily_reports_to_csv(end_date):
    csv_output = io.StringIO()
    csv_writer = _create_csv_writer(csv_output)
    for i in range(30):
        date = end_date - datetime.timedelta(days=i)
        file_key = date.strftime("%Y-%m-%d")
        data = load_datafile_as_json(file_key)
        if not data or not data['entries']:
            log.debug(f"No data found for {file_key}")
            continue

        log.info(f"Appending data from file: {file_key}")
        _convert_rows_to_csv(data['entries'], csv_writer.writerow)
    return csv_output


def _create_csv_writer(csv_output):
    field_names = ['day_of_week', 'time_of_day', 'temperature', 'humidity', 'pressure']
    writer = csv.writer(csv_output, delimiter=',')
    writer.writerow(field_names)
    return writer


def _convert_rows_to_csv(data_rows, row_callback):
    for row in data_rows:
        epoch_time = int(row['t'] / 1000)
        dt_object = datetime.datetime.utcfromtimestamp(epoch_time)
        midnight = dt_object.replace(hour=0, minute=0, second=0, microsecond=0)
        seconds_elapsed_from_midnight = (dt_object - midnight).seconds
        date_from_epoch_time = datetime.datetime.fromtimestamp(epoch_time)
        day_of_week = date_from_epoch_time.strftime('%A')
        csv_row = [day_of_week, seconds_elapsed_from_midnight, row['tmp'], row['hum'], row['pr']]
        row_callback(csv_row)


def _upload_csv_to_s3(csv_output, file_key):
    # get output from the csv writer
    csv_output.seek(0)
    store_file(file_key, csv_output.getvalue())
    log.info(f"File '{file_key}' stored in S3 bucket.")


def train_models(event, context):
    sagemaker = boto3.client('sagemaker')
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    training_job_name = f'{date_today}-train-models-job-{int(datetime.datetime.now().timestamp())}'

    sagemaker.create_training_job(
        TrainingJobName=training_job_name,
        AlgorithmSpecification={
              'TrainingImage': '746614075791.dkr.ecr.us-west-1.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3',
              'TrainingInputMode': 'File',
        },
        # TODO: Use env variable?
        RoleArn='arn:aws:iam::904381544143:role/rpi-aws-iot-prototype-dev-us-west-1-lambdaRole',
        ResourceConfig={
          'InstanceType': 'ml.m5.large',
          'InstanceCount': 1,
          'VolumeSizeInGB': 5,
        },
        OutputDataConfig={
            'S3OutputPath': 's3://rpi-atmospheric-data/models/',
        },
        StoppingCondition={
          'MaxRuntimeInSeconds': 180,
        },
        HyperParameters={
          'sagemaker_program': 'train.py',
          'sagemaker_submit_directory': 's3://rpi-atmospheric-data/sagemaker/',
        })

    log.info("Building models, waiting for completion")
    status = 'InProgress'
    tries = 30
    while status in ['InProgress', 'Stopping'] and tries > 0:
        time.sleep(10)
        response = sagemaker.describe_training_job(TrainingJobName=training_job_name)
        if 'FailureReason' in response:
            log.info(f'Failure reason: {response["FailureReason"]}')

        status = response['TrainingJobStatus']
        tries -= 1


def _get_dataset_path():
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    return f'aggregates/{date_today}-aggregate-data.csv'
