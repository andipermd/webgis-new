const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Konfigurasikan folder penyimpanan sementara
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Gunakan /tmp/rasterImage sebagai direktori penyimpanan sementara
    cb(null, "/tmp/rasterImage");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadRaster = multer({ storage: storage });

// Fungsi untuk membaca daftar file dalam folder tertentu
const getResultFilePaths = (directory = "/tmp/result/") => {
  // Gunakan /tmp/result untuk hasil file
  try {
    // Baca isi folder
    const files = fs.readdirSync(directory);

    // Ubah nama file menjadi path absolut
    const filePaths = files.map((file) => path.join(directory, file));

    return filePaths;
  } catch (error) {
    console.error("Error membaca file path:", error);
    return [];
  }
};

module.exports = { uploadRaster, getResultFilePaths };

// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");

// // handle upload raster
// // Konfigurasikan folder penyimpanan sementara
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/rasterImage");
//   },
//   filename: (req, file, cb) => {
//     cb(null, file.originalname);
//   },
// });

// const uploadRaster = multer({ storage: storage });

// // handle baca file path result
// // Fungsi untuk membaca daftar file dalam folder tertentu
// const getResultFilePaths = (directory = "./uploads/result/") => {
//   try {
//     // Baca isi folder
//     const files = fs.readdirSync(directory);

//     // Ubah nama file menjadi path absolut
//     const filePaths = files.map((file) => path.join(directory, file));

//     return filePaths;
//   } catch (error) {
//     console.error("Error membaca file path:", error);
//     return [];
//   }
// };

// module.exports = { uploadRaster, getResultFilePaths };
