const { pool } = require("../../db");
const NodeCache = require("node-cache");
const {
  fetchAndCacheData,
  normalizeString,
  cache,
} = require("../hooks/functions");

// const cache = new NodeCache({ stdTTL: 1200 }); // TTL (Time To Live) of 600 seconds for caché

const filterDataCongresoByCache = async (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    body = {},
    exactFilters = [],
    rangeFilters = [],
  } = process.env.START_MODE === "GRAPHQL" ? req : req.body;
  // console.log("Page", page);
  // console.log("exactFilters", exactFilters);
  // console.log("BODY:", body);
  // console.log("Req:", req);

  const offset = (page - 1) * pageSize;

  const cacheKey = "congreso_data";

  let results = cache.get(cacheKey);

  if (!results) {
    // console.log("Cache miss!");
    results = await fetchAndCacheData();
  }

  // Create filters object
  const filters = Object.keys(body).reduce((acc, key) => {
    if (rangeFilters.includes(key)) {
      if (body[key]?.min !== undefined && body[key]?.max !== undefined) {
        acc[key] = body[key];
      }
    } else if (typeof body[key] === "string") {
      acc[key] = body[key].toLowerCase();
    } else {
      acc[key] = body[key];
    }
    return acc;
  }, {});

  // console.log("Filters:", filters);

  // Filters
  let filteredData = results?.filter((item) => {
    return Object.keys(filters).every((key) => {
      const filterValue = filters[key];

      if (
        typeof filterValue === "object" &&
        filterValue.min &&
        filterValue.min !== undefined &&
        filterValue.max &&
        filterValue.max !== undefined
      ) {
        if (typeof item[key] === "string" && !isNaN(Date.parse(item[key]))) {
          const itemDate = new Date(item[key]);
          const minDate = new Date(filterValue.min);
          const maxDate = new Date(filterValue.max);
          return itemDate >= minDate && itemDate <= maxDate;
        } else if (typeof item[key] === "number") {
          // range numbers
          const itemNumber = item[key];
          return (
            itemNumber >= Number(filterValue.min) &&
            itemNumber <= Number(filterValue.max)
          );
        }
      } else if (Array.isArray(filterValue) && filterValue.length > 0) {
        return filterValue.some((value) =>
          item[key]
            ?.toString()
            .toLowerCase()
            .includes(value.toString().toLowerCase())
        );
      } else if (typeof filterValue === "string") {
        const itemValue = normalizeString(item[key]?.toLowerCase());
        return (
          !filterValue ||
          itemValue.includes(normalizeString(filterValue?.toLowerCase()))
        );
      } else {
        return true;
      }
    });
  });

  if (exactFilters && exactFilters.length > 0) {
    exactFilters.forEach((filterKey) => {
      const exactValue = body[filterKey];

      if (Array.isArray(exactValue)) {
        filteredData = filteredData?.filter((item) => {
          return exactValue.some(
            (value) =>
              item[filterKey]?.toString().toLowerCase() ===
              value.toString().toLowerCase()
          );
        });
      } else if (
        exactValue !== undefined &&
        exactValue !== null &&
        exactValue !== ""
      ) {
        // if is not a array, use direct comparison
        filteredData = filteredData?.filter(
          (item) =>
            item[filterKey]?.toString().toLowerCase() ===
            exactValue.toString().toLowerCase()
        );
      }
    });
  }

  if (!filteredData || !filteredData.length) {
    filteredData = [];
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = filteredData.slice(start, end);

  if (process.env.START_MODE === "GRAPHQL") {
    return {
      products: paginatedData || [],
      totalProducts: filteredData.length || 0,
    };
  } else {
    res.status(200).json({
      products: paginatedData || [],
      totalProducts: filteredData.length || 0,
    });
  }
};

//
const filterDataCongresoByDB = async (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    body = {},
    exactFilters = [],
    rangeFilters = [],
  } = process.env.START_MODE === "GRAPHQL" ? req : req.body;

  const offset = (page - 1) * pageSize;
  let whereClauses = [];
  let params = [];

  // 1. CONSTRUCCIÓN DINÁMICA DE LA CLÁUSULA WHERE
  Object.keys(body).forEach((key) => {
    const filterValue = body[key];

    // --- 1.1 Manejar Rangos (fechas o números) ---
    // Se asume que el frontend envía {min: '2023-01-01', max: '2023-12-31'}
    if (rangeFilters.includes(key) && filterValue?.min && filterValue?.max) {
      whereClauses.push(`\`${key}\` BETWEEN ? AND ?`);
      params.push(filterValue.min);
      params.push(filterValue.max);

      // --- 1.2 Manejar Multiselect (Arrays) ---
      // Se asume que estos campos contienen etiquetas que se buscan usando LIKE
    } else if (Array.isArray(filterValue) && filterValue.length > 0) {
      const conditions = filterValue
        .map((val) => `\`${key}\` LIKE ?`)
        .join(" OR ");
      whereClauses.push(`(${conditions})`);
      // Los arrays multiselect necesitan comodines para buscar subcadenas
      filterValue.forEach((val) => params.push(`%${val}%`));

      // --- 1.3 Manejar Filtros de Texto (String) ---
    } else if (typeof filterValue === "string" && filterValue.length > 0) {
      // Filtro de Coincidencia EXACTA (Expediente)
      if (exactFilters.includes(key)) {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(filterValue);
      } else {
        // Filtro de Búsqueda Parcial (Contenido, etc.)
        whereClauses.push(`\`${key}\` LIKE ?`);
        params.push(`%${filterValue}%`);
      }
    }
  });

  // Crear la condición WHERE final o dejarla vacía
  const whereCondition =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 2. DEFINICIÓN DE CONSULTAS SQL
  const dataQuery = `
        SELECT SQL_CALC_FOUND_ROWS *
        FROM congreso_preguntas_01_11_2024 
        ${whereCondition}
        ORDER BY Presentada DESC 
        LIMIT ?, ?;
    `;

  const countQuery = `SELECT FOUND_ROWS() as totalProducts;`;

  // Agregar OFFSET y LIMIT (paginación) a los parámetros de la consulta de datos
  const finalParams = [...params, offset, pageSize];

  let paginatedData = [];
  let totalCount = 0;

  try {
    // 3. EJECUCIÓN DE CONSULTAS

    // 3.1 Consulta de Datos (incluye SQL_CALC_FOUND_ROWS)
    // Se asume que 'pool' es una conexión que devuelve un array de resultados.
    // Si usas 'mysql2', el resultado es [rows, fields].
    const [rows] = await pool.query(dataQuery, finalParams);
    paginatedData = rows;

    // 3.2 Consulta de Conteo (FOUND_ROWS())
    const [countRows] = await pool.query(countQuery);
    totalCount = countRows[0]?.totalProducts || 0;
  } catch (error) {
    console.error("Error al filtrar datos desde MySQL:", error);
    // Manejo de errores
    if (process.env.START_MODE === "GRAPHQL") {
      throw new Error("Error fetching data from database.");
    } else {
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // 4. RESPUESTA AL FRONTEND
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
  filterDataCongresoByCache,
  filterDataCongresoByDB,
};
