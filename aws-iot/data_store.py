import json
import boto3
import os
import logging
from botocore.exceptions import ClientError
from io import BytesIO

S3_BUCKET = os.getenv('S3_BUCKET')
EMPTY_JSON_ARRAY = '{"entries":[]}'

S3 = boto3.client('s3')
log = logging.getLogger()
log.setLevel(logging.INFO)


# Loads the file from S3 and returns it as JSON. Returns None if the file does not exist.
def load_file_as_json(file_key):
    file_obj = _safe_load_file(file_key)
    log.debug(f'File object {"exists" if file_obj else "does not exist"}')
    if not file_obj:
        return None

    file_content = file_obj['Body'].read().decode('utf-8')
    json_data = json.loads(file_content)
    return json_data


# Appends the data to the JSON file in S3 under the "entries" key which is an array.
# If the file does not exist, it will be created.
#
# IMPROVEMENT: Implementation is specific to the JSON structure of the data points whereas the other methods in this
# file are generic. This method should be refactored to be more generic. Pull the JSON structure specific code out?
def append_data_as_json(data_points, file_key):
    json_data = load_file_as_json(file_key) or json.loads(EMPTY_JSON_ARRAY)
    json_data['entries'].extend(data_points)
    _store_json_file(file_key, json_data)
    print(f"File '{file_key}' in bucket '{S3_BUCKET}' updated successfully.")


# Stores a file in S3 with the given key and content.
def store_file_stream(file_key, file_content):
    # Store the file in the S3 bucket
    try:
        S3.put_object(Bucket=S3_BUCKET, Key=file_key, Body=file_content)
    except Exception as e:
        log.error(f"An error occurred while storing file {file_key} in {S3_BUCKET}: {e}")


# Loads a file from S3 and returns it as a string. Returns None if the file does not exist.
def load_file_as_string(file_key):
    file_obj = _safe_load_file(file_key)
    if not file_obj:
        log.error(f'Failed to load file {file_key} from S3')
        return None
    env_content = file_obj['Body'].read().decode('utf-8')
    return env_content


# Attempts to delete the file from S3. Outputs appropriate warnings/errors if the file does not exist or if an error.
# Does not throw any errors if the file could not be deleted.
def delete_file(file_key):
    s3 = boto3.client('s3')
    try:
        log.info(f"Preparing to delete file {file_key} from S3")
        file_params = {'Bucket': S3_BUCKET, 'Key': file_key}
        s3.head_object(**file_params)
        s3.delete_object(**file_params)
        log.info(f"Deleted {file_key} successfully.")
    except s3.exceptions.NoSuchKey:
        log.warning(f'File {file_key} does not exist in {S3_BUCKET}')
    except Exception as e:
        # IMPROVEMENT: raise the exception?
        log.error(f"An error occurred while deleting file {file_key} from {S3_BUCKET}: {e}")


# Updates the JSON file in S3 with the given key and json data. Input json data should be in object form and not string.
def _store_json_file(file_key, json_data):
    updated_file_content = json.dumps(json_data).encode('utf-8')
    store_file_stream(file_key, BytesIO(updated_file_content))


# Attempts to load the file from S3. Returns None if the file does not exist or if an error occurs.
def _safe_load_file(file_key):
    try:
        log.debug(f"Checking if file {file_key} exists in {S3_BUCKET}")
        file_params = {'Bucket': S3_BUCKET, 'Key': file_key}
        S3.head_object(**file_params)
        log.debug(f"File {file_key} exists in {S3_BUCKET}.")
        return S3.get_object(**file_params)
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404' or error_code == 'NoSuchKey':
            log.debug(f"File {file_key} does not exist in {S3_BUCKET}.")
        else:
            log.debug(f"An error occurred while safe loading file {file_key} from {S3_BUCKET}: {e}")

        return None
    except Exception as e:
        log.debug(f"An error occurred while safe loading file {file_key} from {S3_BUCKET}: {e}")
        return None

