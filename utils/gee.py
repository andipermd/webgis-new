import ee
import requests

ee.Authenticate()

ee.Initialize(project="ee-andipermadi001")



# get AOI
url = "http://localhost:3000/areas"
aoi = requests.get(url)

S2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterDate('2020-01-01', '2024-01-01').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 90))

print(S2)