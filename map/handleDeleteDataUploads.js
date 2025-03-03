const fs = require("fs").promises;
const path = require("path");

async function deleteFilesInDirectory(directory) {
  try {
    const files = await fs.readdir(directory);

    if (files.length === 0) {
      return;
    }

    const deletePromises = files.map((file) => {
      const filePath = path.join(directory, file);
      return fs.unlink(filePath);
    });

    await Promise.all(deletePromises);
    console.log(`${files.length} file(s) deleted.`);
  } catch (err) {
    console.error("Error deleting files:", err);
  }
}

module.exports = deleteFilesInDirectory;

// // Contoh penggunaan
// const directoryToDelete = "uploads/rasterImage";
// deleteFilesInDirectory(directoryToDelete);
