import logging
import boto3
import datetime
import os
from predict import MODEL_TYPES
from data_store import delete_file

log = logging.getLogger()
log.setLevel(logging.INFO)


# IMPROVEMENT: This ought to take parameters to indicate which resources to clean up so that the step functions can
# pass in the appropriate names/ids of resources to clean up rather than inferring the names based on the current date.
def cleanup_resources(event, context):
    log.info("Cleaning up models, endpoint configs, endpoints")
    _cleanup_inference_resources()
    _cleanup_model_artifacts()
    # IMPROVEMENT: Clean up aggregate data file?


def _cleanup_inference_resources():
    sagemaker = boto3.client('sagemaker')
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')

    for model_type in MODEL_TYPES:
        model_name = f'{date_today}-{model_type}-model'
        endpoint_config_name = f'{date_today}-{model_type}-endpoint-config'
        endpoint_name = f'{model_name}-endpoint'

        try:
            sagemaker.delete_endpoint(EndpointName=endpoint_name)
            log.info(f"Deleted endpoint: {endpoint_name}")
        except Exception as e:
            log.info(f"Unable to delete endpoint {endpoint_name}: {e}")

        try:
            sagemaker.delete_endpoint_config(EndpointConfigName=endpoint_config_name)
            log.info(f"Deleted endpoint config: {endpoint_config_name}")
        except Exception as e:
            log.info(f"Unable to delete endpoint config {endpoint_config_name}: {e}")

        try:
            sagemaker.delete_model(ModelName=model_name)
            log.info(f"Deleted model: {model_name}")
        except Exception as e:
            log.info(f"Unable to delete model {model_name}: {e}")


def _cleanup_model_artifacts():
    date_today = datetime.datetime.now().strftime('%Y-%m-%d')
    for model_type in MODEL_TYPES:
        model_file_key = f'{date_today}-{model_type}-model.tar.gz'
        delete_file(model_file_key)
