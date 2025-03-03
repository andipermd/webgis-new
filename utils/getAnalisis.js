// agar python jalan

const { spawn } = require("child_process");
const path = require("path");

const eksekusiPython = () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "scripts", "main.py");
    const process = spawn("python", [scriptPath]);

    let outputData = ""; // Untuk menyimpan output dari Python

    process.stdout.on("data", (data) => {
      outputData += data.toString(); // Simpan output Python
      console.log(`Output dari Python: ${data.toString()}`);
    });

    process.stderr.on("data", (data) => {
      console.error(`Error: ${data.toString()}`);
      reject(data.toString()); // Jika ada error, reject promise
    });

    process.on("close", (code) => {
      console.log(`Proses Python selesai dengan kode: ${code}`);
      if (code === 0) {
        resolve(outputData.trim()); // Kirim output setelah proses selesai
      } else {
        reject("Python script failed");
      }
    });
  });
};

module.exports = eksekusiPython;
