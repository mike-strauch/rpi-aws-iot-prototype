import pandas as pd
import boto3
import os


def deploy_models(event, context):
    # TODO: figure this out
    result = {'models': []}
    # result['models'].append({'type': 'temperature', 'endpoint': _deploy_model(temp_model_name, 'temperature')})
    # result['models'].append({'type': 'humidity', 'endpoint': _deploy_model(hum_model_name, 'humidity')})
    # result['models'].append({'type': 'pressure', 'endpoint': _deploy_model(pressure_model_name, 'pressure')})
    return result


def _deploy_model(model_file_key, model_type):
    sagemaker = boto3.client('sagemaker')

    model_name = f'{model_type}-model'
    endpoint_config_name = f'{model_type}-endpoint-config'
    response = sagemaker.create_model(
        ModelName=model_name,
        PrimaryContainer={
            'Image': '746614075791.dkr.ecr.us-west-1.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3',
            'ModelDataUrl': f's3://{os.getenv("S3_BUCKET")}/models/{model_file_key}',
        },
        # TODO Update to use env variable?
        ExecutionRoleArn='arn:aws:iam::904381544143:role/rpi-aws-iot-prototype-dev-FuturePredictorStateMachi-NfoYsRpWITgj'
    )

    endpoint_config_response = sagemaker.create_endpoint_config(
        EndpointConfigName=endpoint_config_name,
        ProductionVariants=[
            {
                'VariantName': 'AllTraffic',
                'ModelName': model_name,  # Must match the ModelName used above
                'InstanceType': 'ml.m3.medium',  # Specify the desired instance type
                'InitialInstanceCount': 1,
            },
        ]
    )

    endpoint_response = sagemaker.create_endpoint(
        EndpointName='your-endpoint-name',
        EndpointConfigName=endpoint_config_name  # Must match the EndpointConfigName used above
    )

    return response


def predict_daily_atmospheric_metrics(event, context):
    # For now, load the data from the CSV and get averages for the temperature, pressure, and humidity so that
    # when querying the respective models, you can pass in average values for the feature not being predicted
    # load the aggregated data file from s3
    # run the prediction model
    # store the prediction results to s3
    pass