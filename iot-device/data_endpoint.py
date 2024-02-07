import json
from awscrt import io, mqtt, auth, http
from awsiot import mqtt_connection_builder


class DataEndpoint:

    def __init__(self):
        # TODO: Put values in a config file
        self.mqtt_connection = None
        self.endpoint = 'a1ktn0eiegwonn-ats.iot.us-west-1.amazonaws.com'
        self.root_ca_file = '../keys/root-CA.crt'
        self.cert_path = '../keys/RPi3BHome.cert.pem'
        self.key_path = '../keys/RPi3BHome.private.key'
        self.client_id = 'rpi3bTempHumPress'
        self.topic = 'rpi/sensor/events'
        self._connect()

    def _connect(self):
        self.mqtt_connection = mqtt_connection_builder.mtls_from_path(
            endpoint=self.endpoint,
            cert_filepath=self.cert_path,
            pri_key_filepath=self.key_path,
            ca_filepath=self.root_ca_file,
            on_connection_interrupted=self.on_connection_interrupted,
            on_connection_resumed=self.on_connection_resumed,
            on_puback=self.on_publish,
            client_id=self.client_id,
            clean_session=False,
            keep_alive_secs=6
        )
        self.mqtt_connection.on_puback = self.on_publish
        connect_future = self.mqtt_connection.connect()
        connect_future.result()

    def push_data(self, data):
        self.mqtt_connection.publish(topic=self.topic, payload=json.dumps(data), qos=mqtt.QoS.AT_LEAST_ONCE)
        disconnect_future = self.mqtt_connection.disconnect()
        disconnect_future.result()

    # Callback when connection is accidentally lost.
    def on_connection_interrupted(connection, error, **kwargs):
        print("Connection interrupted. error: {}".format(error))

    # Callback when an interrupted connection is re-established.
    def on_connection_resumed(connection, return_code, session_present, **kwargs):
        print("Connection resumed. return_code: {} session_present: {}".format(return_code, session_present))

    def on_publish(connection, error, **kwargs):
        print("publish complete")