const proj4 = require("proj4");
const fs = require("fs");
const GeoTIFF = require("geotiff");
const { getResultFilePaths } = require("./map/handleRasterData");
const { error } = require("console");

// Dapatkan path hasil file raster
const paths = getResultFilePaths();

// Proyeksi asal dan tujuan
const EPSG4326 = "+proj=longlat +datum=WGS84 +no_defs";
const originalProjection = "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs";

// Fungsi untuk mengonversi proyeksi data raster
async function convertRasterProjection(inputPath, outputPath) {
  // Baca file raster
  const tiff = await GeoTIFF.fromFile(inputPath);
  const image = await tiff.getImage();

  // Dapatkan data pixel dan bounds
  const data = await image.readRasters();
  const width = image.getWidth();
  const height = image.getHeight();
  const [minX, minY, maxX, maxY] = image.getBoundingBox();

  // Konversi koordinat bounds ke EPSG 4326
  const convert = proj4(originalProjection, EPSG4326);
  const [newMinX, newMinY] = convert.forward([minX, minY]);
  const [newMaxX, newMaxY] = convert.forward([maxX, maxY]);

  // Buat raster baru dengan proyeksi yang telah dikonversi
  const newGeoTransform = [
    newMinX,
    (newMaxX - newMinX) / width,
    0,
    newMaxY,
    0,
    (newMinY - newMaxY) / height,
  ];
  const newTIFF = await GeoTIFF.write({
    fileDirectory: {
      ModelTiepoint: [0, 0, 0, newGeoTransform[0], newGeoTransform[3], 0],
      ModelPixelScale: [newGeoTransform[1], Math.abs(newGeoTransform[5]), 0],
    },
    values: data,
    width: width,
    height: height,
    geotiffDataType: image.fileDirectory.SampleFormat
      ? image.fileDirectory.SampleFormat[0]
      : undefined,
  });

  // Simpan file raster baru
  fs.writeFileSync(outputPath, new Buffer.from(newTIFF));
}

// Panggil fungsi untuk mengonversi raster dari setiap path yang ada
paths.forEach((path, index) => {
  const inputPath = path;
  const outputPath = `./converted_rasters/converted_raster_${index}.tif`;
  convertRasterProjection(inputPath, outputPath).then(() => {
    console.log(`Raster di ${inputPath} berhasil dikonversi ke ${outputPath}`);
  });
});
