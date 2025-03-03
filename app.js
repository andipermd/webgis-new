const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const getDataByPolygon = require("./map/map.controller");
const { PrismaClient } = require("@prisma/client");
const eksekusiPython = require("./utils/getAnalisis");
const { processRasterTiles } = require("./map/handleRasterData");
const { uploadRaster, getResultFilePaths } = require("./map/handleRasterData");
const deleteFilesInDirectory = require("./map/handleDeleteDataUploads");

const prisma = new PrismaClient();

// server running
const app = express();
dotenv.config();

const port = process.env.PORT;

// Tingkatkan batas payload JSON
app.use(express.json({ limit: "10mb" })); // Ubah 10mb jika perlu
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(bodyParser.json());

// Setup Method Override
app.use(methodOverride("_method"));

//SETUP EJS
const path = require("path");

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main-layout");

// app.set('view engine', 'ejs')
// app.use(expressLayouts)
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(express.urlencoded({ extended: true }));

//FLASH DLL
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const { json } = require("stream/consumers");
const { Cursor } = require("mongoose");

// const router = require('./map/map.controller')

// Halaman Home
app.get("/", (req, res) => {
  res.render("index", {
    title: "Halaman Home",
    layout: "layouts/main-layout",
  });
});

let currentPolygonUser = [];
let dataClipUser = [];
let rasterUserPath = [];
let resultPath = [];

app.use(express.json());

// Halaman Map
app.get("/map", (req, res) => {
  if (rasterUserPath) {
    rasterUserPath = [];
    resultPath = [];

    // menghapus file raster user
    deleteFilesInDirectory("uploads/rasterImage");
    deleteFilesInDirectory("uploads/result");

    currentPolygonUser = [];
    dataClipUser = [];
    res.render("map", {
      title: "Halaman Map",
      layout: "layouts/main-layout",
    });
  }
});

// let currentPolygonUser = [];
// let dataClipUser = [];

// Route untuk mendapatkan data poligon
app.get("/areas", async (req, res) => {
  res.json(dataClipUser);
});

// Route untuk menambahkan atau memperbarui data poligon
app.post("/areas", async (req, res) => {
  try {
    currentPolygonUser = req.body;

    const data = getDataByPolygon(currentPolygonUser);

    const resultClipData = (await data).features;
    dataClipUser = resultClipData;

    res.json({ success: true, message: "Polygon added/updated successfully" });
  } catch (error) {
    console.error("Error parsing JSON:", error);
    res.status(400).send("Invalid JSON received");
  }
});

// Route untuk menghapus data poligon
app.delete("/areas", async (req, res) => {
  try {
    currentPolygonUser = []; // Reset array data poligon
    dataClipUser = [];
    res.json({ success: true, message: "Polygon deleted successfully" });
  } catch (error) {
    console.error("Error deleting polygon:", error);
    res.status(500).json({ success: false, message: "Error deleting polygon" });
  }
});

app.get("/shpUser", async (req, res) => {
  res.json(currentPolygonUser);
});

app.get("/product/batasAdministrasi", async (req, res) => {
  try {
    // Query ke database untuk mengambil data geom dan provinsi
    const provinsiData = await prisma.$queryRaw`
       SELECT provinsi, ST_AsGeoJSON(geom) as geom
       FROM "Batas-provinsi";
      `;

    // Transformasi data ke dalam format GeoJSON
    const geojsonFeatureCollection = {
      type: "FeatureCollection",
      features: provinsiData.map((row) => ({
        type: "Feature",
        properties: { provinsi: row.provinsi },
        geometry: JSON.parse(row.geom), // Parse geom dari string ke JSON
      })),
    };

    // Kirimkan data GeoJSON ke frontend
    console.log(geojsonFeatureCollection);
    res.json(geojsonFeatureCollection);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/product/kerapatanBangunan", async (req, res) => {
  try {
    const ndbiData = await prisma.$queryRaw`
    SELECT ndbi, ST_AsGeoJSON(geom) as geom
    FROM "hasilndbi1";
    `;
    // Transformasi data ke dalam format GeoJSON
    const geojsonFeatureCollection = {
      type: "FeatureCollection",
      features: ndbiData.map((row) => ({
        type: "Feature",
        properties: { ndbi: row.ndbi },
        geometry: JSON.parse(row.geom), // Parse geom dari string ke JSON
      })),
    };

    res.json(geojsonFeatureCollection);
  } catch (error) {
    return error;
  }
});

app.get("/upload", (req, res) => {
  resultPath = getResultFilePaths();
  res.json({ rasterUserPath, analysisResult: resultPath });
});

app.get("/resultAnalysis", async (req, res) => {
  try {
    const resultPath = await eksekusiPython(); // Tunggu hingga Python selesai
    res.json({ rasterUserPath, analysisResult: resultPath });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error executing Python script", details: error });
  }
});

// app.get("/resultAnalysis", (req, res) => {
//   eksekusiPython();
//   res.json({ rasterUserPath, analysisResult: resultPath });
// });

// Rute untuk menangani upload file
app.post("/upload", uploadRaster.single("raster"), (req, res) => {
  // res.send(`File ${req.file.originalname} telah diunggah!`);

  if (req.file) {
    const filePath = path.join("uploads/rasterImage", req.file.originalname);
    rasterUserPath.push(filePath); // Simpan path file dalam array

    res.json({
      message: `File ${req.file.originalname} telah diunggah!`,
      filePath: filePath,
    });
  } else {
    res.status(400).send("File tidak ditemukan.");
  }
});

// Halaman projek
app.get("/projek", (req, res) => {
  res.render("projek", {
    title: "Halaman Projek",
    layout: "layouts/main-layout",
  });
});

app.use("/", (req, res) => {
  res.sendStatus(404);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
