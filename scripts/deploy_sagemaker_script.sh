cd ./sagemaker || exit
tar -czvf train.tar.gz train.py
aws s3 cp train.tar.gz s3://rpi-atmospheric-data/sagemaker/
aws s3 cp script.py s3://rpi-atmospheric-data/sagemaker/