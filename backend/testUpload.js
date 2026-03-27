const fs = require("fs");

async function testUpload() {
  const imagePath = "./test.jpg";
  const base64Image = fs.readFileSync(imagePath, { encoding: "base64" });

  const body = {
    local_filename: "image.jpg",
    data: base64Image,
    occasion: "interview",
    vibe: "professional",
    season: "winter",
    color: "black",
    notes: "black blazer and trousers"
  };

  const response = await fetch("http://localhost:3001/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  console.log(result);
}

testUpload().catch(console.error);