// view map awal default
const defaultView = [-2.1807364492185926, 117.38427142201431];
let map = L.map("map", { zoomControl: false }).setView(defaultView, 5);
// L.control.zoom({ position: "bottomright" }).addTo(map);
// var legend = L.control({ position: "bottomright" });

// Basemap tile Layer Esri
const esriSatelitBasemap = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri &mdash; Source",
  }
);

const osmBasemap = L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }
).addTo(map);

const OpenTopoMap = L.tileLayer(
  "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 17,
    attribution: ' &copy;  <a href="https://opentopomap.org">OpenTopoMap</a>',
  }
);

// LEAFLET DRAW
// Group untuk menyimpan layer yang digambar
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const contentBeforeDraw = document.querySelector(".content-before-draw");
const contentAfterDraw = document.querySelector(".content-after-draw");
const backDrawBtn = document.querySelector("#back-draw-btn");
const drawPolygonBtn = document.querySelector("#drawPolygonBtn");
const contentAfterProses = document.querySelector(".data-after-prosses");

// Variabel global
// 1. draw
let isDrawing = false;
let currentPolygon;

// 2. upload shp layer
let shpLayer;

// Fungsi untuk memulai dan menghentikan mode menggambar
const toggleDrawPolygon = () => {
  if (isDrawing) {
    // BEFORE
    // Jika sedang menggambar, hentikan proses
    isDrawing = false;
    contentAfterDraw.classList.add("hidden");
    map.off("click", drawPolygon); // Matikan event menggambar

    // Hapus poligon dari peta dan api
    if (currentPolygon) {
      const getPolygon = currentPolygon.getLatLngs()[0];
      fetch("/areas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPolygon),
      })
        .then((response) => response.json())
        .then((data) => {
          map.removeLayer(currentPolygon); // Hapus poligon dari peta
          console.log("Polygon removed from backend", data);
          currentPolygon = null; // Reset variabel poligon
        });
    }
    console.log("Stopped drawing polygon");

    contentBeforeDraw.classList.toggle("hidden");
  } else {
    // Mulai menggambar
    isDrawing = true;
    currentPolygon = L.polygon([], { color: "blue" }).addTo(map); // Poligon kosong
    map.on("click", drawPolygon); // Tambahkan event listener untuk menggambar
    console.log("Started drawing polygon");
    contentBeforeDraw.classList.add("hidden");
    contentAfterDraw.classList.remove("hidden");
  }
};

// Fungsi untuk menggambar polygon
const drawPolygon = (e) => {
  const latlng = e.latlng; // Ambil koordinat klik
  currentPolygon.addLatLng(latlng); // Tambahkan titik ke polygon
  console.log("Point added:", latlng);
  if (currentPolygon) {
    const coordinates = currentPolygon.getLatLngs(); // Mendapatkan semua koordinat polygon
    // console.log("Polygon Coordinates:", coordinates[0]);
    return coordinates;
  } else {
    console.log("No polygon available!");
    return null;
  }
};

// Event listener untuk tombol "Draw Polygon"
drawPolygonBtn.addEventListener("click", toggleDrawPolygon);

// Event listener untuk tombol "Back" --> menghapus layer
backDrawBtn.addEventListener("click", () => {
  contentAfterProses.classList.add("hidden");
  toggleDrawPolygon();
  console.log("tombol hapus layer di klik");
  shpLayer = null;
});

//Proses Data Polygon User
const btnAfterDraw = document.getElementById("btnAfterDraw");
btnAfterDraw.addEventListener("click", () => {
  const polygonData = currentPolygon.getLatLngs();
  console.log(polygonData[0].length);

  if (polygonData[0].length < 3) {
    alert("polygon tidak valid, minimal 3 titik kak.. ");
  } else {
    // kirim data polygon User ke backend
    console.log(polygonData[0]);
    fetch("/areas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(polygonData[0]),
    })
      .then((response) => response.json())
      .then((data) => {
        // DATA POLYGON USER DI PROSES

        // dapat kan data hasil proses
        fetch("/areas")
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((data) => {
            contentAfterProses.classList.remove("hidden");

            // Buat variabel untuk menyimpan elemen list
            let listItems = "";

            // Iterasi melalui data dan tambahkan setiap elemen sebagai item list
            data.map((e) => {
              listItems += `<li>${e.properties.provinsi}</li>`;
            });

            // Set innerHTML dari elemen dengan class 'result' dengan list yang telah dibuat
            document.querySelector(
              ".result"
            ).innerHTML = `<ul>${listItems}</ul>`;
          })
          .catch((error) => {
            console.error(
              "There has been a problem with your fetch operation:",
              error
            );
          });

        console.log("Success:", data);
      })
      .catch((error) => console.error("Error:", error));
  }
});

// Upload SHP
const contentAfterUpload = document.querySelector(".content-after-upload");
const uploadShp = document.getElementById("uploadShp");
const btnBackShp = document.getElementById("btn-back-shp");

uploadShp.addEventListener("click", () => {
  contentBeforeDraw.classList.toggle("hidden");
  contentAfterUpload.classList.toggle("hidden");
  backDrawBtn.classList.remove("hidden");
});

let currentGeomShp;

btnBackShp.addEventListener("click", () => {
  contentBeforeDraw.classList.toggle("hidden");
  contentAfterUpload.classList.toggle("hidden");
  contentAfterProses.classList.toggle("hidden");
  console.log(currentGeomShp);

  // Hapus poligon dari peta dan api
  if (currentGeomShp) {
    fetch("/areas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentGeomShp),
    })
      .then((response) => response.json())
      .then((data) => {
        map.removeLayer(shpLayer); // Hapus layer GeoJSON dari peta
        shpLayer = null; // Reset referensi layer
        console.log("Layer deleted from backend and map");
      });
  }
});

// Proses data SHP
document
  .getElementById("fileInput")
  .addEventListener("change", async (event) => {
    const files = event.target.files;
    const fileMap = {};

    // Buat fileMap berdasarkan nama file tanpa ekstensi
    for (let file of files) {
      const [name, extension] = file.name
        .split(".")
        .reduce(
          (acc, part, idx, arr) =>
            idx < arr.length - 1
              ? [acc[0] + part, acc[1]]
              : [acc[0], part.toLowerCase()],
          ["", ""]
        );
      fileMap[name] = { ...fileMap[name], [extension]: file };
    }

    for (let name in fileMap) {
      const {
        shp: shpFile,
        dbf: dbfFile,
        shx: shxFile,
        prj: prjFile,
      } = fileMap[name] || {};

      if (shpFile && dbfFile && shxFile) {
        try {
          // Konversi file ke ArrayBuffer
          const [shpBuffer, dbfBuffer, shxBuffer, prjBuffer] =
            await Promise.all([
              shpFile.arrayBuffer(),
              dbfFile.arrayBuffer(),
              shxFile.arrayBuffer(),
              prjFile?.arrayBuffer() || null,
            ]);

          // Parse SHP dan DBF
          const shpData = shp.parseShp(shpBuffer);
          const dbfData = dbfBuffer ? shp.parseDbf(dbfBuffer) : null;

          // Gabungkan data SHP dan DBF ke GeoJSON
          const geojson = shp.combine([shpData, dbfData]);

          // menampilkan ke peta
          let cleanedGeoJson = cleanCoordinates(geojson);

          currentGeomShp = cleanedGeoJson.features.map((e) => {
            return e.geometry.coordinates;
          });

          // Gunakan logika untuk menangani tipe geometri yang berbeda
          if (geojson && geojson.features.length > 0) {
            const coordinates = [];

            geojson.features.forEach((feature) => {
              const { geometry } = feature;

              if (geometry.type === "Polygon") {
                // Ambil koordinat pertama untuk Polygon
                geometry.coordinates[0].forEach(([lng, lat]) => {
                  coordinates.push({ lat, lng });
                });
              } else if (geometry.type === "MultiPolygon") {
                // Ambil semua koordinat untuk MultiPolygon
                geometry.coordinates.forEach((polygon) => {
                  polygon[0].forEach(([lng, lat]) => {
                    coordinates.push({ lat, lng });
                  });
                });
              }
            });

            // Kirim data ke backend
            await fetch("/areas", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(coordinates),
            });

            // ambil data
            fetch("/areas")
              .then((response) => {
                if (!response.ok) {
                  throw new Error("Network response was not ok");
                }
                return response.json();
              })
              .then((data) => {
                contentAfterProses.classList.toggle("hidden");
                let listItems = "";
                data.map((e) => {
                  listItems += `<li>${e.properties.provinsi}</li>`;
                });

                document.querySelector(
                  ".result"
                ).innerHTML = `<ul>${listItems}</ul>`;
              });

            console.log("Data sent to backend:", coordinates);
          } else {
            console.error("Invalid GeoJSON structure from SHP");
          }
        } catch (error) {
          console.error("Error processing SHP files:", error);
        }
      }
    }
  });

function cleanCoordinates(geoJson) {
  // Fungsi rekursif untuk membersihkan koordinat di dalam GeoJSON
  function processCoordinates(coordinates) {
    if (typeof coordinates[0] === "number") {
      // Ambil hanya dua elemen pertama (latitude dan longitude)
      return [coordinates[0], coordinates[1]];
    }
    return coordinates.map(processCoordinates);
  }

  if (geoJson.type === "FeatureCollection") {
    geoJson.features.forEach((feature) => {
      feature.geometry.coordinates = processCoordinates(
        feature.geometry.coordinates
      );
    });
  } else if (geoJson.type === "Feature") {
    geoJson.geometry.coordinates = processCoordinates(
      geoJson.geometry.coordinates
    );
  }

  // Perbesar tampilan peta dengan animasi flyTo
  const bounds = L.geoJSON(geoJson).getBounds();
  map.flyToBounds(bounds, {
    duration: 5, // Durasi animasi dalam detik
    easeLinearity: 0.1, // Kehalusan animasi
  });

  setTimeout(() => {
    // Tambahkan GeoJSON layer ke peta
    shpLayer = L.geoJSON(geoJson, {
      style: {
        color: "#ff7800", // Warna garis
        weight: 2, // Ketebalan garis
        fillColor: "#fffc75", // Warna isi
        fillOpacity: 0.5, // Transparansi isi
      },
    }).addTo(map);
  }, 5000);

  return geoJson;
}

// Fungsi untuk menampilkan geometri di peta
function addGeometryToMap(shpGeom) {
  // Konversi shpGeom menjadi GeoJSON FeatureCollection
  const geojson = {
    type: "FeatureCollection",
    features: shpGeom.map((coordinates) => ({
      type: "Feature",
      geometry: {
        type: "Polygon", // Ubah jika tipe geometri bukan Polygon
        coordinates: coordinates,
      },
      properties: {}, // Properti tambahan jika diperlukan
    })),
  };

  // Tambahkan GeoJSON layer ke peta
  shpLayer = L.geoJSON(geojson, {
    style: {
      color: "#ff7800", // Warna garis
      weight: 2, // Ketebalan garis
      fillColor: "#fffc75", // Warna isi
      fillOpacity: 0.5, // Transparansi isi
    },
  }).addTo(map);

  console.log(shpLayer);

  // Perbesar tampilan peta dengan animasi flyTo
  const bounds = L.geoJSON(geojson).getBounds();
  map.flyToBounds(bounds, {
    duration: 5, // Durasi animasi dalam detik
    easeLinearity: 0.1, // Kehalusan animasi
  });
}

// List of Data Spatial Layer

const menu2 = document.getElementById("menu2");
// Ambil elemen checkbox
const btnBatasProv = document.getElementById("getBatasProvIdn");
const btnGetNdbi = document.getElementById("getNdbiLayer");

// Objek untuk menyimpan referensi layer
let layers = {};

// Fungsi untuk menambahkan atau menghapus layer batas provinsi
btnBatasProv.addEventListener("change", () => {
  if (btnBatasProv.checked) {
    if (!layers.batasProv) {
      showLoader("#menu2");
      console.log("Meminta data batas provinsi sekarang");
      fetch("/product/batasAdministrasi")
        .then((response) => response.json())
        .then((data) => {
          hideLoader("#menu2");
          layers.batasProv = L.geoJSON(data).addTo(map);
          console.log("Data batas provinsi ditambahkan", data);
        })
        .catch((error) => console.error("Error:", error));
    }
  } else {
    if (layers.batasProv) {
      hideLoader("#menu2");
      map.removeLayer(layers.batasProv);
      delete layers.batasProv;
      console.log("Data batas provinsi dihapus dari peta.");
    }
  }
});

// Fungsi untuk menambahkan atau menghapus layer NDBI
btnGetNdbi.addEventListener("change", () => {
  if (btnGetNdbi.checked) {
    if (!layers.ndbi) {
      console.log("Meminta data NDBI sekarang");
      fetch("/product/kerapatanBangunan")
        .then((response) => response.json())
        .then((data) => {
          layers.ndbi = L.geoJSON(data, {
            style: (feature) => {
              let color;
              let fillColor;

              switch (feature.properties.ndbi) {
                case "Pemukiman jarang":
                  color = "#ffff00";
                  fillColor = "#ffff00";
                  break;
                case "Pemukiman Rapat":
                  color = "#a52a2a";
                  fillColor = "#a52a2a";
                  break;
                case "Pemukiman sangat Rapat":
                  color = "#ff0000";
                  fillColor = "#ff0000";
                  break;
                default:
                  fillColor = "#ffffff";
              }

              return {
                color: color || "#000000",
                weight: 2,
                opacity: 1,
                fillColor: fillColor,
                fillOpacity: 0.5,
              };
            },
          }).addTo(map);
          console.log("Data NDBI ditambahkan", data);
        })
        .catch((error) => console.error("Error:", error));
    }
  } else {
    if (layers.ndbi) {
      map.removeLayer(layers.ndbi);
      delete layers.ndbi;
      console.log("Data NDBI dihapus dari peta.");
    }
  }
});

// analisis raster image
const uploadRaster = document.getElementById("uploadRaster");
const rasterInput = document.getElementById("rasterInput");
const wrapMenu3Section = document.querySelector("#menu3 section");
const wrapMenu3Main = document.querySelector("#menu3 main");
const loader = document.querySelector(".loader");

uploadRaster.addEventListener("click", function () {
  rasterInput.click();
});

let resultLayers = {
  NDVI: { layer: null, legend: null },
  NDBI: { layer: null, legend: null },
};

// upload file user
rasterInput.addEventListener("change", async function (event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) return; // Pastikan ada file yang dipilih

  const fileName = file.name;
  uploadRaster.textContent = "Selected file: " + fileName;

  // Buat FormData untuk mengirim file
  var formData = new FormData();
  formData.append("raster", file);

  try {
    // Kirim file ke backend
    showLoader("#menu3 main");

    const uploadResponse = await fetch("/upload-raster", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    // jika berhasil di upload
    console.log("File berhasil diunggah!");
    hideLoader("#menu3 main");
    wrapMenu3Section.classList.remove("hidden");
    wrapMenu3Main.classList.add("hidden");

    // pilih analisis
    //1. NDVI
    // Ambil elemen checkbox
    const getNDVIbtn = document.getElementById("getNDVI");
    const getNDBIbtn = document.getElementById("getNDBI");
    const backToUpload = document.querySelector(".menu-analisis button");

    backToUpload.addEventListener("click", async function () {
      try {
        const response = await fetch("/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Gagal menghapus area.");
        }

        // Setelah DELETE berhasil (atau tidak ada currentGeomShp), lanjut
        wrapMenu3Main.classList.remove("hidden");
        wrapMenu3Section.classList.add("hidden");
      } catch (error) {
        console.error("🔥 Error saat backToUpload:", error);
      }
    });

    getNDVIbtn.addEventListener("change", async () => {
      console.log("Tunggu minta data NDVI...");

      if (getNDVIbtn.checked) {
        const cekResult = await fetch("/upload");
        const cekDataResult = await cekResult.json();
        const resultPath = cekDataResult.analysisResult;

        // ambil data path ndvi, jika belum request
        if (resultPath.length === 0) {
          showLoader("#menu3 section");

          const response = await fetch("/resultAnalysis");
          const data = await response.json();
          console.log(data);

          hideLoader("#menu3 section");

          // ganti filePath menjadi URL baru
          loadRasterToMap(data.filePath, "NDVI");
        } else {
          // jika sudah pernah request
          console.log(resultPath.length);
          console.log(resultPath);
          loadRasterToMap(resultPath, "NDVI");
        }
      } else {
        console.log("Menghapus NDVI dari peta...");
        removeLayerFromMap("NDVI");
      }
    });

    getNDBIbtn.addEventListener("change", async () => {
      console.log("Tunggu minta data NDBI...");

      if (getNDBIbtn.checked) {
        const cekResult = await fetch("/upload");
        const cekDataResult = await cekResult.json();
        const resultPath = cekDataResult.analysisResult;

        // ambil data path NDBI
        if (resultPath.length === 0) {
          showLoader("#menu3 section");
          const response = await fetch("/resultAnalysis");
          const data = await response.json();
          hideLoader("#menu3 section");
          loadRasterToMap(data.filePath, "NDBI");
        } else {
          console.log(resultPath.length);
          console.log(resultPath);
          loadRasterToMap(resultPath, "NDBI");
        }
      } else {
        console.log("Menghapus NDBI dari peta...");
        removeLayerFromMap("NDBI");
      }
    });

    getNDBIbtn.addEventListener("change", () => {
      if (getNDBIbtn.checked) {
        console.log("minta NDBI nih");
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
});

async function loadRasterToMap(path, type) {
  try {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const georaster = await parseGeoraster(arrayBuffer);

    console.log(`${type} georaster:`, georaster);

    // Pilih simbologi berdasarkan tipe analisis
    let getColor, legendTitle, legendLabels, legendColors;

    if (type === "NDVI") {
      getColor = (value) => {
        if (value >= 0 && value <= 1) return "#0000FF"; // biru
        if (value > 1 && value <= 2) return "#FFFF00"; // kuning
        if (value > 2 && value <= 3) return "#7CFC00"; // hijau terang
        if (value > 3 && value <= 4) return "#FF0000"; // merah
        return "#000000"; // hitam jika diluar nilai index
      };
      legendTitle = "NDVI Index";
      legendLabels = ["0 - 1", "1 - 2", "2 - 3", "3 - 4"];
      legendColors = ["#0000FF", "#FFFF00", "#7CFC00", "#FF0000"];
    }

    if (type === "NDBI") {
      getColor = (value) => {
        if (value >= 0 && value <= 1) return "#008000"; // Hijau (Vegetasi)
        if (value > 1 && value <= 2) return "#ADFF2F"; // Hijau terang (Vegetasi jarang)
        if (value > 2 && value <= 3) return "#DAA520"; // Coklat keemasan (Lahan terbuka)
        if (value > 3 && value <= 4) return "#8B0000"; // Merah gelap (Area terbangun)
        return "#000000"; // Hitam untuk nilai di luar range
      };
      legendTitle = "NDBI Klasifikasi";
      legendLabels = ["0 - 1", "1 - 2", "2 - 3", "3 - 4"];
      legendColors = ["#0000FF", "#FFFF00", "#7CFC00", "#FF0000"];
    }

    // Hapus layer sebelumnya jika ada
    if (resultLayers[type].layer) {
      map.removeLayer(resultLayers[type].layer);
    }

    // Tambahkan layer baru
    resultLayers[type].layer = new GeoRasterLayer({
      georaster: georaster,
      opacity: 0.7,
      pixelValuesToColorFn: (values) => getColor(values[0]),
      resolution: 300,
    });

    resultLayers[type].layer.addTo(map);
    map.fitBounds(resultLayers[type].layer.getBounds());

    // Tambahkan legenda
    addLegend(type, legendTitle, legendLabels, legendColors);
  } catch (error) {
    console.error(`Error loading ${type} raster:`, error);
  }
}

// Fungsi untuk menambahkan legenda ke peta
function addLegend(type, title, labels, colors) {
  // Hapus legenda lama jika ada
  if (resultLayers[type].legend) {
    map.removeControl(resultLayers[type].legend);
  }

  let legend = L.control({ position: "bottomright" });

  legend.onAdd = function (map) {
    var div = L.DomUtil.create("div", "info legend");
    div.style.background = "white";
    div.style.padding = "10px";
    div.style.borderRadius = "8px";
    div.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
    div.style.fontSize = "14px";
    div.style.fontFamily = "Arial, sans-serif";
    div.innerHTML = `<b>${title}</b><br><br>`;

    for (var i = 0; i < labels.length; i++) {
      div.innerHTML +=
        '<div style="display: flex; align-items: center; margin-bottom: 5px;">' +
        '<i style="background:' +
        colors[i] +
        '; width: 20px; height: 20px; display: inline-block; margin-right: 8px; border-radius: 4px;"></i> ' +
        labels[i] +
        "</div>";
    }

    return div;
  };

  legend.addTo(map);
  resultLayers[type].legend = legend;
}

// Fungsi untuk menghapus layer dari peta
function removeLayerFromMap(type) {
  if (resultLayers[type].layer) {
    map.removeLayer(resultLayers[type].layer);
    resultLayers[type].layer = null;
  }
  if (resultLayers[type].legend) {
    map.removeControl(resultLayers[type].legend);
    resultLayers[type].legend = null;
  }
}

// fungsi visualisasi hasil analisis ndvi
function loadNDVIToMap(path) {
  fetch(path)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => {
      parseGeoraster(arrayBuffer).then((georaster) => {
        console.log("georaster:", georaster);

        // Fungsi untuk mengelompokkan nilai NDVI ke dalam interval dan memberi warna sesuai simbologi
        function getColor(value) {
          if (value >= 0 && value <= 1) {
            return "#0000FF"; // Biru (0 - 1)
          } else if (value > 1 && value <= 2) {
            return "#FFFF00"; // Kuning (1 - 2)
          } else if (value > 2 && value <= 3) {
            return "#7CFC00"; // Hijau terang (2 - 3)
          } else if (value > 3 && value <= 4) {
            return "#FF0000"; // Merah (3 - 4)
          } else {
            return "#000000"; // Hitam jika nilai di luar rentang
          }
        }

        var layer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 0.7,
          pixelValuesToColorFn: (values) => getColor(values[0]), // Terapkan warna berdasarkan interval
          resolution: 300, // Sesuaikan resolusi tampilan
        });

        layer.addTo(map);
        map.fitBounds(layer.getBounds());

        // Fungsi untuk menambahkan legenda ke peta
        function addLegend() {
          var legend = L.control({ position: "bottomright" });

          legend.onAdd = function (map) {
            var div = L.DomUtil.create("div", "info legend"),
              intervals = ["0 - 1", "1 - 2", "2 - 3", "3 - 4"],
              colors = ["#0000FF", "#FFFF00", "#7CFC00", "#FF0000"];

            // Loop untuk menambahkan setiap interval ke legenda
            for (var i = 0; i < intervals.length; i++) {
              div.innerHTML +=
                '<i style="background:' +
                colors[i] +
                '; width: 20px; height: 20px; display: inline-block; margin-right: 5px;"></i> ' +
                intervals[i] +
                "<br>";
            }

            return div;
          };

          legend.addTo(map);
        }

        addLegend();
      });
    })
    .catch((error) => console.error("Error loading raster:", error));
}

// loader animation

function showLoader(targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  // Cek apakah loader sudah ada
  let loader = target.querySelector(".loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.className = "loader";
    target.appendChild(loader);
  }

  loader.classList.remove("hidden");
}

function hideLoader(targetSelector) {
  const target = document.querySelector(targetSelector);
  const loader = target?.querySelector(".loader");
  if (loader) loader.classList.add("hidden");
}
