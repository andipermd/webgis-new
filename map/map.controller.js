// function clip data
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// 2. waktu lama / bisa di cepetin sih
async function getDataByPolygon(coordinatUser) {
  try {
    // Pastikan koordinat user tersedia dan membentuk polygon minimal
    if (coordinatUser && coordinatUser.length > 2) {
      // Membentuk GeoJSON polygon
      const geoJson = {
        type: "Polygon",
        coordinates: [
          coordinatUser
            .map((coor) => [coor.lng, coor.lat])
            .concat([[coordinatUser[0].lng, coordinatUser[0].lat]]), // Menutup polygon
        ],
      };

      // console.log("Generated GeoJSON:", JSON.stringify(geoJson, null, 2));

      // Query untuk validasi geometri
      const isValid = await prisma.$queryRaw`
        SELECT ST_IsValid(ST_GeomFromGeoJSON(${geoJson})) AS is_valid;`;

      if (!isValid[0]?.is_valid) {
        console.warn("Invalid geometry detected, attempting to fix...");
      }

      // Query clipping data dengan validasi dan perbaikan geometri
      const clippedProv = await prisma.$queryRaw`
      SELECT 
        provinsi, 
        ST_AsGeoJSON(
          ST_Intersection(
            ST_MakeValid(geom), 
            ST_MakeValid(ST_GeomFromGeoJSON(${geoJson}))
          )
        ) AS geom 
      FROM "Batas-provinsi" 
      WHERE 
        ST_Intersects(
          ST_MakeValid(geom), 
          ST_MakeValid(ST_GeomFromGeoJSON(${geoJson}))
        ) 
        AND ST_Envelope(ST_GeomFromGeoJSON(${geoJson})) && geom;`;

      if (clippedProv.length === 0) {
        throw new Error(
          "No intersecting data found. Please check your polygon."
        );
      }

      // Membuat FeatureCollection GeoJSON dari hasil query
      const geojsonFeatureCollection = {
        type: "FeatureCollection",
        features: clippedProv.map((row) => ({
          type: "Feature",
          properties: { provinsi: row.provinsi },
          geometry: JSON.parse(row.geom),
        })),
      };

      return geojsonFeatureCollection;
    } else {
      throw new Error(
        "Invalid input: Coordinate array must have at least 3 points to form a polygon."
      );
    }
  } catch (err) {
    console.error("Error processing polygon data:", err.message);
    throw new Error(
      "Error processing polygon data. Check the input and geometry."
    );
  }
}

// // 2. waktu lama / bisa di cepetin sih
// async function getDataByPolygon(coordinatUser) {
//   try {
//     // Pastikan koordinat user tersedia dan membentuk polygon minimal
//     if (coordinatUser && coordinatUser.length > 2) {
//       // Membentuk GeoJSON polygon
//       const geoJson = {
//         type: "Polygon",
//         coordinates: [
//           coordinatUser
//             .map((coor) => [coor.lng, coor.lat])
//             .concat([[coordinatUser[0].lng, coordinatUser[0].lat]]), // Menutup polygon
//         ],
//       };

//       console.log("Generated GeoJSON:", JSON.stringify(geoJson, null, 2));

//       // Query untuk validasi geometri
//       const isValid = await prisma.$queryRaw`
//         SELECT ST_IsValid(ST_GeomFromGeoJSON(${geoJson})) AS is_valid;`;

//       if (!isValid[0]?.is_valid) {
//         console.warn("Invalid geometry detected, attempting to fix...");
//       }

//       // Query clipping data dengan validasi dan perbaikan geometri
//       const clippedProv = await prisma.$queryRaw`
//         SELECT
//           provinsi,
//           ST_AsGeoJSON(
//             ST_Intersection(
//               ST_MakeValid(geom),
//               ST_MakeValid(ST_GeomFromGeoJSON(${geoJson}))
//             )
//           ) AS geom
//         FROM "Batas-provinsi"
//         WHERE ST_Intersects(
//           ST_MakeValid(geom),
//           ST_MakeValid(ST_GeomFromGeoJSON(${geoJson}))
//         );`;

//       if (clippedProv.length === 0) {
//         throw new Error(
//           "No intersecting data found. Please check your polygon."
//         );
//       }

//       // Membuat FeatureCollection GeoJSON dari hasil query
//       const geojsonFeatureCollection = {
//         type: "FeatureCollection",
//         features: clippedProv.map((row) => ({
//           type: "Feature",
//           properties: { provinsi: row.provinsi },
//           geometry: JSON.parse(row.geom),
//         })),
//       };

//       return geojsonFeatureCollection;
//     } else {
//       throw new Error(
//         "Invalid input: Coordinate array must have at least 3 points to form a polygon."
//       );
//     }
//   } catch (err) {
//     console.error("Error processing polygon data:", err.message);
//     throw new Error(
//       "Error processing polygon data. Check the input and geometry."
//     );
//   }
// }

// before
// async function getDataByPolygon(coordinatUser) {
//   try {
//     // data json harus menjadi geojson , sepeti struktur dibawah ini
//     if (coordinatUser != undefined) {
//       const geoJson = {
//         type: "Polygon",
//         coordinates: [
//           coordinatUser
//             .map((coor) => [coor.lng, coor.lat])
//             .concat([[coordinatUser[0].lng, coordinatUser[0].lat]]),
//         ],
//       };

//       const clippedProv =
//         await prisma.$queryRaw` SELECT provinsi, ST_AsGeoJSON(ST_Intersection(geom, ST_GeomFromGeoJSON(${geoJson}))) as geom FROM "Batas-provinsi" WHERE ST_Intersects(geom, ST_GeomFromGeoJSON(${geoJson})); `;

//       const geojsonFeatureCollection = {
//         type: "FeatureCollection",
//         features: clippedProv.map((row) => ({
//           type: "Feature",
//           properties: { provinsi: row.provinsi },
//           geometry: JSON.parse(row.geom),
//         })),
//       };

//       return geojsonFeatureCollection;
//     } else {
//       return false;
//     }
//   } catch (err) {
//     console.error("Error clipping data:", err);
//     throw new Error("Error clipping data");
//   }
// }

module.exports = getDataByPolygon;
