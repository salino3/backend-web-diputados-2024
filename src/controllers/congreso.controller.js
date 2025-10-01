const { pool } = require("../../db");
const { normalizeString } = require("../hooks/functions");

// Allowed list columns to prevent identifier injection attacks
const ALLOWED_COLUMNS = [
  "Expediente",
  "Contenido",
  "Presentada",
  "diputados_autores",
  "Grupo_Parlamentario",
  "comunidades_tags",
  "provincia_tags",
  "municipios_tags",
];

//
const filterDataCongresoByDB = async (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    body = {},
    exactFilters = [],
    rangeFilters = [],
  } = process.env.START_MODE === "GRAPHQL" ? req : req.body;

  const pageSizeLimited = Math.min(pageSize, 50);
  const offset = (page - 1) * pageSizeLimited;
  let whereClauses = [];
  let params = [];

  // 1. DYNAMIC WHERE CLAUSE CONSTRUCTION
  Object.keys(body).forEach((key) => {
    const filterValue = body[key];

    // SECURITY: If the key (column name) is not allowed, it is ignored.
    if (!ALLOWED_COLUMNS.includes(key)) {
      console.warn(
        `[SECURITY WARNING] Ignored query attempt on disallowed column: ${key}`
      );
      return;
    }

    // --- 1.1 Handle Range Filters (dates or numbers) ---
    // Checks if the key is in rangeFilters AND has at least a min or max value.
    if (rangeFilters.includes(key) && (filterValue?.min || filterValue?.max)) {
      let condition = "";

      // 1. Determine if the column needs special date conversion (Presentada: DD/MM/YYYY)
      const requiresDateConversion = key === "Presentada";

      // Column Name in SQL: either plain backticks or STR_TO_DATE() wrapper
      const columnName = requiresDateConversion
        ? `STR_TO_DATE(\`${key}\`, '%d/%m/%Y')` // Applies DD/MM/YYYY conversion
        : `\`${key}\``;

      // Parameter Pattern: either STR_TO_DATE(?) or simple ?
      const datePattern = requiresDateConversion
        ? "STR_TO_DATE(?, '%Y-%m-%d')"
        : "?";

      // 2. Build the SQL Condition based on which values (min/max/both) were provided

      if (filterValue.min && filterValue.max) {
        // Case A: Both min AND max -> Use BETWEEN
        condition = `${columnName} BETWEEN ${datePattern} AND ${datePattern}`;
        whereClauses.push(condition);
        params.push(filterValue.min, filterValue.max);
      } else if (filterValue.min) {
        // Case B: Only Minimum -> Use Greater Than or Equal To (>=)
        // Returns all records FROM the min date onwards.
        condition = `${columnName} >= ${datePattern}`;
        whereClauses.push(condition);
        params.push(filterValue.min);
      } else if (filterValue.max) {
        // Case C: Only Maximum -> Use Less Than or Equal To (<=)
        // Returns all records UP TO the max date.
        condition = `${columnName} <= ${datePattern}`;
        whereClauses.push(condition);
        params.push(filterValue.max);
      }

      // --- 1.2 Handle Multiselect (Arrays) ---
    } else if (Array.isArray(filterValue) && filterValue.length > 0) {
      const conditions = filterValue
        .map((val) => `\`${key}\` LIKE ?`)
        .join(" OR ");
      whereClauses.push(`(${conditions})`);
      filterValue.forEach((val) => params.push(`%${val}%`));

      // --- 1.3 Handle Text Filters (String) ---
    } else if (typeof filterValue === "string" && filterValue.length > 0) {
      // Exact Match Filter (Expediente)
      if (exactFilters.includes(key)) {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(filterValue);
      } else if (key === "Contenido") {
        // SPECIAL CASE: 'Contenido' (Free Text Search with normalization)
        const normalizedValue = normalizeString(filterValue);
        whereClauses.push(`LOWER(\`${key}\`) LIKE ?`);
        params.push(`%${normalizedValue}%`);
      } else {
        // All other Partial Search Filters
        whereClauses.push(`\`${key}\` LIKE ?`);
        params.push(`%${filterValue}%`);
      }
    }
  });

  // Create the final WHERE condition or leave it empty
  const whereCondition =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 2. SQL QUERY DEFINITION (Uses CTEs for single-query data + count)
  const dataQuery = `
        WITH filtered AS (
            SELECT *
            FROM congreso_preguntas_01_11_2024
            ${whereCondition}
        )
        SELECT results.*,
               totals.totalProducts
        FROM (
            SELECT COUNT(*) AS totalProducts
            FROM filtered
        ) AS totals
        JOIN (
            SELECT *
            FROM filtered
            ORDER BY Presentada DESC
            LIMIT ?, ?
        ) AS results;
    `;

  // Add OFFSET and LIMIT (pagination) to the data query parameters
  const finalParams = [...params, offset, pageSizeLimited];

  try {
    const [rows] = await pool.query(dataQuery, finalParams);

    const paginatedData = rows.map(({ totalProducts, ...rest }) => rest);
    const totalCount = rows.length > 0 ? rows[0].totalProducts : 0;

    if (process.env.START_MODE === "GRAPHQL") {
      return {
        products: paginatedData,
        totalProducts: totalCount,
      };
    } else {
      res.status(200).json({
        products: paginatedData,
        totalProducts: totalCount,
      });
    }
  } catch (error) {
    console.error("Error al filtrar datos desde MySQL:", error);
    // Error Handling
    if (process.env.START_MODE === "GRAPHQL") {
      throw new Error("Error fetching data from database.");
    } else {
      return res.status(500).json({ error: "Internal Server error" });
    }
  }
};

module.exports = {
  filterDataCongresoByDB,
};
