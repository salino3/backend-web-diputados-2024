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

  // Ensure pageSize does not exceed the security limit
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
    // Assumes the frontend sends {min: '2023-01-01', max: '2023-12-31'}
    if (rangeFilters.includes(key) && filterValue?.min && filterValue?.max) {
      whereClauses.push(`\`${key}\` BETWEEN ? AND ?`);
      params.push(filterValue.min);
      params.push(filterValue.max);

      // --- 1.2 Handle Multiselect (Arrays) ---
      // Assumes these fields contain tags searched using LIKE
    } else if (Array.isArray(filterValue) && filterValue.length > 0) {
      const conditions = filterValue
        .map((val) => `\`${key}\` LIKE ?`)
        .join(" OR ");
      whereClauses.push(`(${conditions})`);
      // Multiselect arrays require wildcards for substring search
      filterValue.forEach((val) => params.push(`%${val}%`));

      // --- 1.3 Handle Text Filters (String) ---
    } else if (typeof filterValue === "string" && filterValue.length > 0) {
      // Exact Match Filter (Expediente)
      if (exactFilters.includes(key)) {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(filterValue);
      } else {
        // Partial Search Filter (Content, Tags, etc.)
        // Uses LIKE, which results in a full table scan on TEXT columns.
        whereClauses.push(`\`${key}\` LIKE ?`);
        params.push(`%${filterValue}%`);
      }
    }
  });

  // Create the final WHERE condition or leave it empty
  const whereCondition =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 2. SQL QUERY DEFINITION
  const dataQuery = `
        SELECT SQL_CALC_FOUND_ROWS *
        FROM congreso_preguntas_01_11_2024 
        ${whereCondition}
        ORDER BY Presentada DESC 
        LIMIT ?, ?;
    `;

  // Query to retrieve the total count calculated by SQL_CALC_FOUND_ROWS
  const countQuery = `SELECT FOUND_ROWS() as totalProducts;`;

  // Add OFFSET and LIMIT (pagination) to the data query parameters
  const finalParams = [...params, offset, pageSizeLimited];

  let paginatedData = [];
  let totalCount = 0;

  try {
    // 3. QUERY EXECUTION

    // 3.1 Data Query (includes SQL_CALC_FOUND_ROWS)
    // Assumes 'pool' connection returns an array of results (e.g., using 'mysql2').
    const [rows] = await pool.query(dataQuery, finalParams);
    paginatedData = rows;

    // 3.2 Count Query (FOUND_ROWS())
    // Retrieves the total number of unfiltered rows from the previous query.
    const [countRows] = await pool.query(countQuery);
    totalCount = countRows[0]?.totalProducts || 0;
  } catch (error) {
    console.error("Error al filtrar datos desde MySQL:", error);
    // Error Handling
    if (process.env.START_MODE === "GRAPHQL") {
      throw new Error("Error fetching data from database.");
    } else {
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // 4. RESPONSE TO THE FRONTEND
  const responseData = {
    products: paginatedData,
    totalProducts: totalCount,
  };

  if (process.env.START_MODE === "GRAPHQL") {
    return responseData;
  } else {
    res.status(200).json(responseData);
  }
};

module.exports = {
  filterDataCongresoByDB,
};
