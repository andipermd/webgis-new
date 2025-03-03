import psycopg2
import rasterio
import numpy as np
from rasterio.io import MemoryFile
from rasterio.transform import from_origin

def fetch_raster():
    """ Mengambil data raster dari PostgreSQL dan mengembalikan array + metadata """
    conn = None
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="geodb",
            user="postgres",
            password="admin",
            port=5432
        )

        query = "SELECT ST_AsTIFF(rast), ST_Metadata(rast) FROM exampleraster LIMIT 1;"

        with conn.cursor() as cur:
            cur.execute(query)
            result = cur.fetchone()

        if result and result[0]:
            with MemoryFile(result[0]) as memfile:
                with memfile.open() as dataset:
                    raster_array = dataset.read(1)  # Baca band ke-1 (NDVI)
                    transform = dataset.transform  # Simpan transformasi spasial
                    crs = dataset.crs  # Simpan sistem koordinat
                    return raster_array, transform, crs
        else:
            print("⚠️ Tidak ada data raster yang ditemukan.")
            return None, None, None

    except psycopg2.Error as e:
        print(f"❌ Error database: {e}")
        return None, None, None

    finally:
        if conn:
            conn.close()


def classify_ndvi(ndvi_array):
    """ Melakukan klasifikasi NDVI berdasarkan threshold """
    classified = np.zeros_like(ndvi_array, dtype=np.uint8)  # Buat array kosong (uint8 agar ukuran file lebih kecil)

    classified[ndvi_array < 0.2] = 1  # Tanah
    classified[(ndvi_array >= 0.2) & (ndvi_array < 0.5)] = 2  # Vegetasi Jarang
    classified[ndvi_array >= 0.5] = 3  # Vegetasi Lebat

    return classified


def save_geotiff(output_path, classified_array, transform, crs):
    """ Menyimpan hasil klasifikasi NDVI sebagai GeoTIFF """
    height, width = classified_array.shape

    with rasterio.open(
        output_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=1,  # Hanya satu band
        dtype=np.uint8,  # Tipe data uint8 (0-255)
        crs=crs,  # Sistem koordinat
        transform=transform,  # Transformasi spasial
    ) as dst:
        dst.write(classified_array, 1)

    print(f"✅ GeoTIFF berhasil disimpan: {output_path}")


if __name__ == "__main__":
    raster, transform, crs = fetch_raster()
    if raster is not None:
        classified_raster = classify_ndvi(raster)
        save_geotiff("classified_ndvi.tif", classified_raster, transform, crs)
