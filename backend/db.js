const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function run(sql, params = []) {
  let pgSql = convertPlaceholders(sql);

  if (/^\s*INSERT\s+INTO\s+outfits/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
    pgSql += " RETURNING id";
  }

  const result = await pool.query(pgSql, params);

  if (/^\s*SELECT/i.test(pgSql)) {
    return [result.rows];
  }

  if (/^\s*INSERT/i.test(pgSql)) {
    return [{ insertId: result.rows?.[0]?.id }];
  }

  if (/^\s*(UPDATE|DELETE)/i.test(pgSql)) {
    return [{ affectedRows: result.rowCount }];
  }

  return [result.rows];
}

module.exports = {
  query: run,
  execute: run,
};