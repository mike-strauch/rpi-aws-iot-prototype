from data_endpoint import DataEndpoint
import board
import adafruit_sht4x
import adafruit_lps2x

i2c = board.I2C()
sht = adafruit_sht4x.SHT4x(i2c)
lps = adafruit_lps2x.LPS22(i2c)
sht.mode = adafruit_sht4x.Mode.NOHEAT_HIGHPRECISION

temperatureC, relative_humidity = sht.measurements
temperatureF = (1.8 * temperatureC) + 32
iot_endpoint = DataEndpoint()

try:
    data = {"temp": temperatureC, "hum": relative_humidity, "press": lps.pressure}
    print(f'Sending data: {data}')
    iot_endpoint.push_data(data)
except Exception as e:
    print(f"An error occurred while pushing data: {e}")
