import boto3
import logging
import datetime
import io
import csv
import time
import os

from data_store import load_datafile_as_json, store_file, get_aggregate_dataset_file_key

log = logging.getLogger()
s3 = boto3.client('s3')


def generate_csv_from_daily_data(event, context):
    log.info("Aggregating data from the last 30 days.")
    today = datetime.datetime.now()
    csv_output = _convert_daily_reports_to_csv(today)
    aggregated_data_file_key = get_aggregate_dataset_file_key()
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
    training_job_params = _get_training_job_params()
    sagemaker = boto3.client('sagemaker')
    sagemaker.create_training_job(**training_job_params)
    log.info("Building models, waiting for completion")
    _wait_for_job_completion(training_job_params['TrainingJobName'])
    log.info("Finished model training")


def _wait_for_job_completion(job_name):
    sagemaker = boto3.client('sagemaker')
    status = 'InProgress'
    tries = 30

    while status in ['InProgress', 'Stopping'] and tries > 0:
        time.sleep(10)
        response = sagemaker.describe_training_job(TrainingJobName=job_name)
        if 'FailureReason' in response:
            log.info(f'model training job failed, failure reason: {response["FailureReason"]}')
            break

        status = response['TrainingJobStatus']
        tries -= 1


def _get_training_job_params():
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    training_job_name = f'{date_today}-train-models-job-{int(datetime.datetime.now().timestamp())}'
    base_s3_bucket = os.getenv('S3_BUCKET')

    return {
        "TrainingJobName": training_job_name,
        "AlgorithmSpecification": {
            "TrainingImage": "746614075791.dkr.ecr.us-west-1.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3",
            "TrainingInputMode": "File"
        },
        "HyperParameters": {
            "sagemaker_program": "train.py",
            "sagemaker_submit_directory": f"s3://{base_s3_bucket}/sagemaker/train.tar.gz",
            "sagemaker_region": "us-west-1",
            "s3_bucket": base_s3_bucket
        },
        "RoleArn": "arn:aws:iam::904381544143:role/rpi-aws-iot-prototype-dev-us-west-1-lambdaRole",
        "OutputDataConfig": {
            "S3OutputPath": f"s3://{base_s3_bucket}/sagemaker"  # Specify your model output location
        },
        "InputDataConfig": [
            {
                "ChannelName": "training",
                "DataSource": {
                    "S3DataSource": {
                        "S3DataType": "S3Prefix",
                        "S3Uri": f"s3://{base_s3_bucket}/aggregates/"
                    }
                }
            }
        ],
        "ResourceConfig": {
            "InstanceType": "ml.m5.large",  # Specify the instance type for training
            "InstanceCount": 1,
            "VolumeSizeInGB": 50
        },
        "StoppingCondition": {
            "MaxRuntimeInSeconds": 86400  # Set a stopping condition (e.g., 24 hours)
        }
    }
