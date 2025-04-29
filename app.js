const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const getDataByPolygon = require("./map/map.controller");
const { PrismaClient } = require("@prisma/client");

const {
  uploadRaster,
  getResultFilePaths,
} = require("./map/handleUploadRaster");
const deleteFilesInDirectory = require("./map/handleDeleteDataUploads");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
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
app.use(express.static(path.join(__dirname, "/public")));
app.use("/tmp", express.static("/tmp"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main-layout");

// app.set('view engine', 'ejs')
// app.use(expressLayouts)
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(express.urlencoded({ extended: true }));

//FLASH DLL

const multer = require("multer");

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
    deleteFilesInDirectory("/tmp/rasterImage");
    deleteFilesInDirectory("/tmp/result");

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

app.get("/db-test", async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

app.delete("/upload", async (req, res) => {
  try {
    // Reset data array untuk file path
    rasterUserPath = [];
    resultPath = [];

    // Hapus file dalam direktori rasterImage dan result
    await deleteFilesInDirectory("/tmp/rasterImage");
    await deleteFilesInDirectory("/tmp/result");

    res.json({ message: "Data berhasil dihapus." });
  } catch (error) {
    console.error("🔥 Error menghapus file:", error);
    res.status(500).json({ error: "Gagal menghapus data." });
  }
});

const upload = multer({ dest: "/tmp/rasterImage" }); // Gunakan /tmp sebagai direktori sementara

app.post("/upload-raster", upload.single("raster"), (req, res) => {
  try {
    // Langsung pakai path absolute
    const uploadedPath = req.file.path;
    rasterUserPath.push(uploadedPath);

    console.log("📂 File diunggah:", uploadedPath);
    console.log("📌 Semua rasterUserPath:", rasterUserPath);

    res.json({
      message: "File uploaded successfully",
      filePath: uploadedPath, // Path absolute dikembalikan
    });
  } catch (error) {
    console.error("🔥 Error saat menyimpan file:", error);
    res.status(500).json({ error: "Gagal menyimpan raster" });
  }
});

app.get("/resultAnalysis", async (req, res) => {
  try {
    // Ambil path terakhir (sudah absolute) TANPA ubah
    const filePath = rasterUserPath.pop();

    console.log("📤 Mengirim file ke FastAPI:", filePath);

    // Kirim file ke FastAPI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(
      "https://diplomatic-learning-production.up.railway.app/process-raster-ndvi",
      formData,
      {
        responseType: "arraybuffer", // karena akan dapat file biner (GeoTIFF)
        headers: formData.getHeaders(),
      }
    );

    // Simpan hasil ke /tmp/result/
    const resultDir = path.join("/tmp", "result");
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const resultPath = path.join(resultDir, "classified_ndvi.tif");
    fs.writeFileSync(resultPath, response.data);

    console.log("✅ NDVI processed dan disimpan:", resultPath);

    // Opsional: hapus file upload original setelah diproses
    // fs.unlinkSync(filePath);

    res.json({
      message: "NDVI processed successfully",
      filePath: "/tmp/result/classified_ndvi.tif", // Path ABSOLUTE (bukan relatif)
    });
  } catch (error) {
    console.error("🔥 Error di resultAnalysis:", error);
    res.status(500).json({ error: "Gagal memproses raster" });
  }
});

app.get("/resultAnalysisNdbi", async (req, res) => {
  try {
    if (rasterUserPath.length === 0) {
      return res.status(400).json({ error: "Tidak ada file yang diunggah" });
    }

    // Ambil path terakhir dan ubah menjadi absolut
    const relativePath = rasterUserPath.pop();
    const filePath = path.resolve(relativePath);

    if (!fs.existsSync(filePath)) {
      console.error("🚨 File tidak ditemukan:", filePath);
      return res.status(400).json({ error: "File tidak ditemukan" });
    }

    console.log("📤 Mengirim file ke FastAPI:", filePath);

    // Kirim ke FastAPI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(
      "https://diplomatic-learning-production.up.railway.app/process-raster-ndbi",
      formData,
      {
        responseType: "arraybuffer",
        headers: formData.getHeaders(),
      }
    );

    // Simpan hasil di /uploads/result/
    const resultDir = path.join("uploads", "result");
    if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

    const resultPath = path.join(resultDir, "classified_ndbi.tif");
    fs.writeFileSync(resultPath, response.data);

    console.log("✅ NDBI processed:", resultPath);

    // // Hapus file asli setelah diproses
    // fs.unlinkSync(filePath);

    res.json({
      message: "NDBI processed successfully",
      filePath: `./${resultPath}`, // Kirim path relatif kembali ke frontend
    });
  } catch (error) {
    console.error("🔥 Error di resultAnalysis:", error);
    res.status(500).json({ error: "Gagal memproses raster" });
  }
});

// Endpoint baru
app.get("/download-result", (req, res) => {
  if (resultPath.length === 0) {
    return res.status(404).json({ error: "Belum ada hasil analisis" });
  }

  const resultPathAnalysis = resultPath[0];

  if (fs.existsSync(resultPathAnalysis)) {
    res.sendFile(resultPathAnalysis);
  } else {
    res.status(404).json({ error: "File NDVI tidak ditemukan" });
  }
});

// app.post("/resultAnalysis", async (req, res) => {
//   try {
//     console.log("Request Body:", req.body);
//     const { analysisType } = req.body;

//     if (!analysisType) {
//       return res.status(400).json({ error: "analysisType diperlukan!" });
//     }

//     // Ambil file raster terbaru dari folder uploads/rasterImage
//     const rasterDir = path.join(__dirname, "uploads", "rasterImage");
//     const files = fs.readdirSync(rasterDir);
//     if (files.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "Tidak ada file raster yang diupload" });
//     }

//     const latestFile = files[0]; // Ambil file pertama (atau buat logika pemilihan file yang lebih baik)
//     const filePath = path.join(rasterDir, latestFile);

//     console.log(
//       `Menggunakan file raster: ${latestFile} untuk analisis ${analysisType}`
//     );

//     // Kirim request ke FastAPI dengan filePath dan analysisType
//     const response = await axios.post(
//       "http://127.0.0.1:8000/process-raster",
//       { filePath, analysisType },
//       { headers: { "Content-Type": "application/json" } }
//     );

//     // Simpan hasil analisis
//     const resultDir = path.join(__dirname, "uploads", "result");
//     if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

//     const resultPath = path.join(resultDir, `${analysisType}_${latestFile}`);
//     fs.writeFileSync(resultPath, response.data);

//     res.json({
//       message: `Analisis ${analysisType} berhasil`,
//       filePath: `/uploads/result/${analysisType}_${latestFile}`,
//     });
//   } catch (error) {
//     console.error("🔥 Error saat analisis raster:", error);
//     res.status(500).json({ error: "Gagal memproses analisis" });
//   }
// });

// app.post("/upload-raster", upload.single("raster"), async (req, res) => {
//   try {
//     const filePath = req.file.path;

//     const formData = new FormData();
//     formData.append("file", fs.createReadStream(filePath));

//     const headers = formData.getHeaders();

//     const response = await axios.post(
//       "http://127.0.0.1:8000/process-raster",
//       formData,
//       { headers }
//     );

//     fs.unlinkSync(filePath);

//     res.json(response.data);
//   } catch (error) {
//     console.error("🔥 Error di Backend Node.js:", error);
//     res.status(500).json({ error: "Terjadi kesalahan di server" });
//   }
// });

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
