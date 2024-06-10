# Environmental Monitoring and Prediction with AWS IoT and Sagemaker

## Project Structure
- `aws-iot/`: [Serverless Framework](https://www.serverless.com/) backend application containing code that serves as an API for the NextJS web application as well as internal functions
used by IoT Core to process incoming sensor data. Also contains AWS Step Function and associated lambdas for preparing, training, and deploying machine learning models.
- `rpi-iot-web-view/` [NextJS](https://nextjs.org/) application for visualizing devices, environment data, and predictions
- `iot-device/`: Python scripts deployed to IoT devices so that they can capture sensor data and send it to AWS IoT Core
- `sagemaker/`: [Sagemaker](https://aws.amazon.com/sagemaker/) scripts used for training and deploying the machine learning model and making predictions

## Architecture
### Iot Device Data Capture
- IoT devices are deployed and integrated with AWS IoT Core for data capture.
- AWS IoT Core (by way of lambda functions) receives data events over MQTT at regular intervals and adds them to an SQS queue.
- Queued events are processed and stored in S3.

### Predictions
By way of an AWS Step Function:
- Every Sunday morning, sensor data from the past 30 days is aggregated, prepared, and stored in S3.
- Machine learning models are trained on the prepared data using Sagemaker training jobs.
- Upon successful training, models are then deployed to individual HTTP endpoints.
- Requests are made to endpoints to make predictions about environmental conditions for the next 7 days. Predictions are stored in S3.
- Predictions are then made available to the NextJS web application through the API deployed on AWS Lambda.

### Web Application
NextJS web application is currently deployed on [Vercel](https://aws-iot-prototype.vercel.app/).