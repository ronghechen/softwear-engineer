require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sharp = require("sharp");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const db = require("./db");
const s3 = require("./s3");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://softwear-engineer.vercel.app"
    ]
  })
);
// Important for base64 image uploads
app.use(express.json({ limit: "10mb" }));

app.get("/", async (req, res) => {
  res.json({ message: "Softwear Engineer backend is running" });
});

// Color match

function rgbToColorName(hex) {
  if (!hex) return "unknown";

  const normalized = hex.toLowerCase();

  const colorMap = [
    { 
      name: "black",
      hex: "#000000",
      rgb: [0, 0, 0] 
    },
    { 
      name: "white",
      hex: "#ffffff",
      rgb: [255, 255, 255] 
    },
    {
      name: "grey",
      hex: "#808080",
      rgb: [128, 128, 128] 
    },
    { 
      name: "red",
      hex: "#ff0000",
      rgb: [255, 0, 0] 
    },
    { 
      name: "orange",
      hex: "#ffa500",
      rgb: [255, 165, 0] 
    },
    { 
      name: "yellow",
      hex: "#ffff00",
      rgb: [255, 255, 0] 
    },
    { 
      name: "green",
      hex: "#008000",
      rgb: [0, 128, 0] 
    },
    { 
      name: "blue",
      hex: "#0000ff",
      rgb: [0, 0, 255] 
    },
    { 
      name: "purple",
      hex: "#800080",
      rgb: [128, 0, 128] 
    },
    { 
      name: "pink",
      hex: "#ffc0cb",
      rgb: [255, 192, 203] 
    },
    { 
      name: "brown",
      hex: "#8b4513",
      rgb: [139, 69, 19] 
    },
    { 
      name: "beige",
      hex: "#f5f5dc",
      rgb: [245, 245, 220] 
    }
  ];

  function hexToRgb(hexValue) {
    const clean = hexValue.replace("#", "");
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16)
    ];
  }

  const target = hexToRgb(normalized);

  let bestMatch = "unknown";
  let bestDistance = Infinity;

  for (const color of colorMap) {
    const [r, g, b] = color.rgb;
    const distance = Math.sqrt((target[0] - r) ** 2 + (target[1] - g) ** 2 + (target[2] - b) ** 2);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = color.name;
    }
  }

  return bestMatch;
}

async function uploadBufferToS3(buffer, key, contentType = "image/jpeg") {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );

  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Resize/compress image and detect color

async function processImage(imageBytes) {
  const compressedBuffer = await sharp(imageBytes)
    .rotate()
    .resize({ width: 1200,
              withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbnailBuffer = await sharp(imageBytes)
    .rotate()
    .resize({ width: 300,
              height: 300,
              fit: "cover" })
    .jpeg({ quality: 65 })
    .toBuffer();

  const stats = await sharp(compressedBuffer).stats();

  const dominant = stats.dominant || null;

  const detectedHex = dominant
    ? `#${[dominant.r, dominant.g, dominant.b]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")}`
    : null;

  const detectedColor = rgbToColorName(detectedHex);

  return {
    compressedBuffer,
    thumbnailBuffer,
    detectedHex,
    detectedColor
  };
}

// Score outfit

function scoreOutfit(base, candidate) {
  let score = 0;

  if (base.id === candidate.id) {
    return -1;
  }

  if (base.vibe && candidate.vibe && base.vibe === candidate.vibe) {
    score += 3;
  }
  if (base.season && candidate.season && base.season === candidate.season) {
    score += 2;
  }
  if (base.occasion && candidate.occasion && base.occasion === candidate.occasion) {
    score += 2;
  }

  const baseColor = base.color || base.detected_color;
  const candidateColor = candidate.color || candidate.detected_color;

  if (baseColor && candidateColor && baseColor === candidateColor) {
    score += 2;
  }

  if (base.notes && candidate.notes) {
    const baseWords = new Set(base.notes.toLowerCase().split(/\W+/).filter(Boolean));
    const candidateWords = candidate.notes.toLowerCase().split(/\W+/).filter(Boolean);

    for (const word of candidateWords) {
      if (baseWords.has(word)) {
        score += 0.25;
      }
    }
  }

  return score;
}

// GET all outfits
/*app.get("/outfits", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      ORDER BY created_at DESC
    `);

    res.json({
      message: "success",
      outfits: rows
    });
  } catch (err) {
    console.error("GET /outfits error:", err);
    res.status(500).json({
      message: err.message,
      outfits: []
    });
  }
});*/

app.get("/outfits", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 12, 1);
    const offset = (page - 1) * limit;

    const [[countRow]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM outfits
    `);

    const [rows] = await db.execute(
      `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      message: "success",
      outfits: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("GET /outfits error:", err);
    res.status(500).json({
      message: err.message,
      outfits: [],
      pagination: null
    });
  }
});

// GET filtered outfits
/*app.get("/outfits/filter", async (req, res) => {
  try {
    const { occasion, vibe, season, color } = req.query;

    let sql = `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      WHERE 1=1
    `;
    const params = [];

    if (occasion) {
      sql += " AND occasion = ?";
      params.push(occasion);
    }

    if (vibe) {
      sql += " AND vibe = ?";
      params.push(vibe);
    }

    if (season) {
      sql += " AND season = ?";
      params.push(season);
    }

    if (color) {
      sql += " AND (color = ? OR detected_color = ?)";
      params.push(color, color);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.execute(sql, params);

    res.json({
      message: "success",
      outfits: rows
    });
  } catch (err) {
    console.error("GET /outfits/filter error:", err);
    res.status(500).json({
      message: err.message,
      outfits: []
    });
  }
});*/

app.get("/outfits/filter", async (req, res) => {
  try {
    const { occasion, vibe, season, color } = req.query;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 6, 1);
    const offset = (page - 1) * limit;

    let whereSql = `WHERE 1=1`;
    const whereParams = [];

    if (occasion) {
      whereSql += " AND occasion = ?";
      whereParams.push(occasion);
    }

    if (vibe) {
      whereSql += " AND vibe = ?";
      whereParams.push(vibe);
    }

    if (season) {
      whereSql += " AND season = ?";
      whereParams.push(season);
    }

    if (color) {
      whereSql += " AND (color = ? OR detected_color = ?)";
      whereParams.push(color, color);
    }

    const [[countRow]] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM outfits
      ${whereSql}
      `,
      whereParams
    );

    const [rows] = await db.execute(
      `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...whereParams, limit, offset]
    );

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      message: "success",
      outfits: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("GET /outfits/filter error:", err);
    res.status(500).json({
      message: err.message,
      outfits: [],
      pagination: null
    });
  }
});

// GET search outfits by keyword

/*app.get("/outfits/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        message: "missing search query",
        outfits: []
      });
    }

    const searchTerm = `%${q.trim()}%`;

    const sql = `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      WHERE occasion LIKE ?
         OR vibe LIKE ?
         OR season LIKE ?
         OR color LIKE ?
         OR notes LIKE ?
      ORDER BY created_at DESC
    `;

    const [rows] = await db.execute(sql, [
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    ]);

    res.json({
      message: "success",
      outfits: rows
    });
  } catch (err) {
    console.error("GET /outfits/search error:", err);
    res.status(500).json({
      message: err.message,
      outfits: []
    });
  }
});*/

app.get("/outfits/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        message: "missing search query",
        outfits: [],
        pagination: null
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 6, 1);
    const offset = (page - 1) * limit;

    const searchTerm = `%${q.trim()}%`;

    const whereSql = `
      WHERE occasion LIKE ?
         OR vibe LIKE ?
         OR season LIKE ?
         OR color LIKE ?
         OR notes LIKE ?
    `;

    const params = [
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    ];

    const [[countRow]] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM outfits
      ${whereSql}
      `,
      params
    );

    const [rows] = await db.execute(
      `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      message: "success",
      outfits: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error("GET /outfits/search error:", err);
    res.status(500).json({
      message: err.message,
      outfits: [],
      pagination: null
    });
  }
});

// GET one outfit by id
app.get("/outfits/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "outfit not found",
        outfit: null
      });
    }

    res.json({
      message: "success",
      outfit: rows[0]
    });
  } catch (err) {
    console.error("GET /outfits/:id error:", err);
    res.status(500).json({
      message: err.message,
      outfit: null
    });
  }
});

// Recommendation feature

app.get("/outfits/:id/recommend", async (req, res) => {
  try {
    const { id } = req.params;

    const [baseRows] = await db.execute(
      `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      WHERE id = ?
      `,
      [id]
    );

    if (baseRows.length === 0) {
      return res.status(404).json({
        message: "outfit not found",
        recommendations: []
      });
    }

    const baseOutfit = baseRows[0];

    const [allRows] = await db.execute(`
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
    `);

    const recommendations = allRows
      .map((candidate) => ({
        ...candidate,
        recommendation_score: scoreOutfit(baseOutfit, candidate)
      }))
      .filter((item) => item.recommendation_score >= 0)
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 3);

    res.json({
      message: "success",
      base_outfit: baseOutfit,
      recommendations
    });
  } catch (err) {
    console.error("GET /outfits/:id/recommend error:", err);
    res.status(500).json({
      message: err.message,
      recommendations: []
    });
  }
});

// POST upload outfit using base64 image data
app.post("/upload", async (req, res) => {
  console.log("**Call to POST /upload");

  try {
    let { local_filename, data, occasion, vibe, season, color, notes } = req.body;

    if (!data || !occasion || !vibe || !season) {
      return res.status(400).json({
        message: "missing required parameters",
        outfitid: -1
      });
    }

    if (!local_filename) {
      local_filename = "uploaded.jpg";
    }

    const cleanedBase64 = data.includes(",") ? data.split(",")[1] : data;
    const imageBytes = Buffer.from(cleanedBase64, "base64");

    const { compressedBuffer, thumbnailBuffer, detectedHex, detectedColor } =
      await processImage(imageBytes);

    const uniqueId = uuidv4();
    const fullKey = `outfits/full/${uniqueId}-${local_filename}.jpg`;
    const thumbKey = `outfits/thumbs/${uniqueId}-${local_filename}.jpg`;

    const imageUrl = await uploadBufferToS3(compressedBuffer, fullKey);
    const thumbnailUrl = await uploadBufferToS3(thumbnailBuffer, thumbKey);

    const finalColor = color || detectedColor;

    const sql = `
      INSERT INTO outfits (
        image_url,
        thumbnail_url,
        occasion,
        vibe,
        season,
        color,
        detected_color,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      imageUrl,
      thumbnailUrl,
      occasion,
      vibe,
      season,
      finalColor,
      detectedColor,
      notes || null
    ]);

    res.json({
      message: "success",
      outfitid: result.insertId,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      detected_color: detectedColor,
      detected_hex: detectedHex
    });
  } catch (err) {
    console.error("POST /upload error:", err);
    res.status(500).json({
      message: err.message,
      outfitid: -1
    });
  }
});

// PUT update outfit metadata

app.put("/outfits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { occasion, vibe, season, color, notes } = req.body;

    if (!occasion || !vibe || !season || !color) {
      return res.status(400).json({
        message: "occasion, vibe, season, and color are required"
      });
    }

    const updateSql = `
      UPDATE outfits
      SET occasion = ?, vibe = ?, season = ?, color = ?, notes = ?
      WHERE id = ?
    `;

    const [result] = await db.execute(updateSql, [
      occasion,
      vibe,
      season,
      color,
      notes || null,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "outfit not found"
      });
    }

    const [rows] = await db.execute(
      `
      SELECT id, image_url, thumbnail_url, occasion, vibe, season, color, detected_color, notes, created_at
      FROM outfits
      WHERE id = ?
      `, [id]);

    res.json({
      message: "success",
      outfit: rows[0]
    });
  } catch (err) {
    console.error("PUT /outfits/:id error:", err);
    res.status(500).json({
      message: err.message
    });
  }
});

// Analytics

app.get("/analytics", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT occasion, vibe, season, color, detected_color
      FROM outfits
    `);

    const countMap = (values) => {
      const counts = {};
      for (const v of values) {
        if (!v) {
          continue;
        }
        counts[v] = (counts[v] || 0) + 1;
      }
      return counts;
    };

    const topEntry = (obj) => {
      let bestKey = null;
      let bestCount = 0;

      for (const [k, v] of Object.entries(obj)) {
        if (v > bestCount) {
          bestKey = k;
          bestCount = v;
        }
      }

      return { 
        value: bestKey,
        count: bestCount 
      };
    };

    const colorCounts = countMap(rows.map((r) => r.color || r.detected_color));
    const vibeCounts = countMap(rows.map((r) => r.vibe));
    const seasonCounts = countMap(rows.map((r) => r.season));
    const occasionCounts = countMap(rows.map((r) => r.occasion));

    res.json({
      message: "success",
      total_outfits: rows.length,
      most_common_color: topEntry(colorCounts),
      most_common_vibe: topEntry(vibeCounts),
      most_common_season: topEntry(seasonCounts),
      most_common_occasion: topEntry(occasionCounts),
      color_breakdown: colorCounts,
      vibe_breakdown: vibeCounts,
      season_breakdown: seasonCounts,
      occasion_breakdown: occasionCounts
    });
  } catch (err) {
    console.error("GET /analytics error:", err);
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE outfit

app.delete("/outfits/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await db.execute("SELECT image_url, thumbnail_url FROM outfits WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "outfit not found" });
    }

    const { image_url, thumbnail_url } = rows[0];
    const prefix = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

    const keysToDelete = [image_url, thumbnail_url]
      .filter(Boolean)
      .map((url) => (url.startsWith(prefix) ? url.slice(prefix.length) : null))
      .filter(Boolean);

    for (const key of keysToDelete) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key
        })
      );
    }

    await db.execute("DELETE FROM outfits WHERE id = ?", [id]);

    res.json({ message: "success" });
  } catch (err) {
    console.error("DELETE /outfits/:id error:", err);
    res.status(500).json({ message: err.message || "error deleting outfit" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});