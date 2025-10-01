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
    if (rangeFilters.includes(key) && filterValue?.min && filterValue?.max) {
      if (key === "Presentada") {
        // The key is to force the conversion of both sides of the comparison to the DATE type
        // using STR_TO_DATE in the WHERE clause.

        // 1. SQL Clause: Converts the column (DD/MM/YYYY) and the parameters (YYYY-MM-DD)
        whereClauses.push(
          `STR_TO_DATE(\`${key}\`, '%d/%m/%Y') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')`
        );

        // 2. Standard behavior for other ranges
        params.push(filterValue.min);
        params.push(filterValue.max);
      } else {
        // Standard behavior for other ranges
        whereClauses.push(`\`${key}\` BETWEEN ? AND ?`);
        params.push(filterValue.min);
        params.push(filterValue.max);
      }

      // --- 1.2 Handle Multiselect (Arrays) ---
      // Values are pre-cleaned from dropdowns.
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

        // SPECIAL CASE: 'Contenido' (Free Text Search)
      } else if (key === "Contenido") {
        const normalizedValue = normalizeString(filterValue);

        whereClauses.push(`LOWER(\`${key}\`) LIKE ?`);

        params.push(`%${normalizedValue}%`);
      } else {
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
