
import rasterio
import numpy as np
import requests
from rasterio.transform import from_origin

# Mengirim permintaan GET, ambil data path rasterImage
response = requests.get("http://localhost:3000/upload")

# Memeriksa status kode respons
if response.status_code == 200:
    # Mengambil data dalam bentuk JSON
    data = response.json()
 
   
    # original raster
    raster = rasterio.open(data["rasterUserPath"][0])
    
    
    # cek data rasternya
    # print(raster.descriptions)
    
    # ndvi analisis
    red = raster.read(3)
    nir = raster.read(4)
    ndvi = (nir.astype(float) - red.astype(float)) / (nir + red)
    
    # klasifikasi indeks ndvi
    def classifyNdvi(ndvi):
        classified = np.zeros(ndvi.shape, dtype=int)
        classified[np.where(ndvi < 0)] = 1  # Air
        classified[np.where((ndvi >= 0) & (ndvi < 0.2))] = 2  # Tanah
        classified[np.where((ndvi >= 0.2) & (ndvi < 0.5))] = 3  # Semak atau rumput
        classified[np.where(ndvi >= 0.5)] = 4  # Hutan atau vegetasi lebat
        return classified
    
    classifiedNdvi = classifyNdvi(ndvi)
    
    # Dapatkan transformasi dan CRS dari dataset asli
    crsAwal = raster.crs
    
    # eksport output
     
    saveNdvi = rasterio.open('./uploads/result/classifiedNdvi.tif', 'w', driver='GTiff', width=raster.width, height=raster.height, count=1, transform=raster.transform, crs=crsAwal, bounds=raster.bounds, dtype=np.float32)
    
    saveNdvi.write(classifiedNdvi, 1)

   
    print('./uploads/result/classifiedNdvi.tif')
    
            
else:
    print(f"Error: {response.status_code}")


