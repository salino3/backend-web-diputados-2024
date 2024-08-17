const { pool } = require("../../db");
const NodeCache = require("node-cache");

// TTL (Time To Live) of 1200 seconds for caché (20 min)
const cache = new NodeCache({ stdTTL: 1200, checkperiod: 600 });

const normalizeString = (str) => {
  if (typeof str !== "string") return "";

  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const fetchAndCacheData = async () => {
  // Query SQL for get all data
  const sql = `SELECT Expediente, Presentada, Contenido, diputados_autores, 
    Grupo_Parlamentario, comunidades_tags, provincia_tags, municipios_tags, url  
    FROM congreso_diputados.congreso_preguntas`;
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql);
    connection.release();

    // Save all caché results
    cache.set("congreso_data", results || []);
    return results;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

module.exports = {
  normalizeString,
  fetchAndCacheData,
  cache,
};

// else if (typeof filterValue === "string") {
//     const itemValue = normalizeString(item[key]?.toString());
//     console.log("ITEM", itemValue);
//     const normalizedFilterValue = normalizeString(filterValue);
//     return !filterValue || itemValue.includes(normalizedFilterValue);
//   }
