import rasterio

raster = rasterio.open('./uploads/result/classifiedNdvi.tif') 
    # Cek proyeksi (CRS)
crs = raster.crs
print("CRS:", crs)
    
# Jika Anda juga ingin melihat informasi lainnya:
print("Transform:", raster.transform)
print("Bounds:", raster.bounds)