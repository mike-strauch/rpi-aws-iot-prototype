import json
import boto3
import os
import logging
import datetime
from botocore.exceptions import ClientError
from io import BytesIO

S3_BUCKET = os.getenv('S3_BUCKET')
EMPTY_JSON_ARRAY = '{"entries":[]}'

S3 = boto3.client('s3')
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def load_datafile_as_json(file_key):
    file_obj = _safe_load_file(file_key)
    logger.debug(f'File object {"exists" if file_obj else "does not exist"}')
    if not file_obj:
        return None

    file_content = file_obj['Body'].read().decode('utf-8')
    json_data = json.loads(file_content)
    return json_data


def _safe_load_file(file_key):
    try:
        logger.debug(f"Checking if file {file_key} exists in {S3_BUCKET}")
        file_params = {'Bucket': S3_BUCKET, 'Key': file_key}
        S3.head_object(**file_params)
        logger.debug(f"File {file_key} exists in {S3_BUCKET}.")
        return S3.get_object(**file_params)
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404' or error_code == 'NoSuchKey':
            logger.debug(f"File {file_key} does not exist in {S3_BUCKET}.")
        else:
            logger.debug(f"An error occurred while safe loading file {file_key} from {S3_BUCKET}: {e}")

        return None
    except Exception as e:
        logger.debug(f"An error occurred while safe loading file {file_key} from {S3_BUCKET}: {e}")
        return None


def append_data_to_file(data_points, file_key):
    json_data = load_datafile_as_json(file_key) or json.loads(EMPTY_JSON_ARRAY)
    json_data['entries'].extend(data_points)
    _store_json_datafile(file_key, json_data)
    print(f"File '{file_key}' in bucket '{S3_BUCKET}' updated successfully.")


def _store_json_datafile(file_key, json_data):
    updated_file_content = json.dumps(json_data).encode('utf-8')
    store_file(file_key, BytesIO(updated_file_content))


def store_file(file_key, file_content):
    # Store the file in the S3 bucket
    try:
        S3.put_object(Bucket=S3_BUCKET, Key=file_key, Body=file_content)
    except Exception as e:
        logger.error(f"An error occurred while storing file {file_key} in {S3_BUCKET}: {e}")


def get_aggregate_dataset_file_key():
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    # TODO: aggregates folder should be env variable/config property?
    return f'aggregates/{date_today}-aggregate-data.csv'


def load_aggregate_env_data():
    aggregate_data_file_key = get_aggregate_dataset_file_key()
    logger.debug(f"Loading aggregate data from s3: {aggregate_data_file_key}")
    obj = S3.get_object(Bucket=S3_BUCKET, Key=aggregate_data_file_key)
    env_content = obj['Body'].read().decode('utf-8')
    return env_content
