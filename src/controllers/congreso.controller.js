const { pool } = require("../../db");
const NodeCache = require("node-cache");
const {
  fetchAndCacheData,
  normalizeString,
  cache,
} = require("../hooks/functions");

// const cache = new NodeCache({ stdTTL: 1200 }); // TTL (Time To Live) of 600 seconds for caché

const getDataCongreso = async (req, res) => {
  const sql = "SELECT * FROM congreso_preguntas LIMIT 10";
  try {
    const connection = await pool.getConnection();
    const [results, fields] = await connection.execute(sql);
    connection.release();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal error of server" });
  }
};

const getDataDistinct = async (req, res) => {
  const sql = `SELECT DISTINCT diputados_autores FROM congreso_diputados.congreso_preguntas`;

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql);
    connection.release();

    const allDiputadosAutores = results.flatMap((row) => {
      const namesArray = JSON.parse(row.diputados_autores.replace(/'/g, '"'));
      return namesArray.map((name) => name.trim());
    });

    const uniqueDiputadosAutores = [...new Set(allDiputadosAutores)];

    res.status(200).json(uniqueDiputadosAutores);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal error of server" });
  }
};

const filterDataCongreso = async (req, res) => {
  const sql = `SELECT Expediente, Presentada, Contenido, diputados_autores, 
  Grupo_Parlamentario, comunidades_tags, provincia_tags, municipios_tags, url  
  FROM congreso_diputados.congreso_preguntas`;

  const {
    page = 1,
    pageSize = 10,
    body = {},
    exactFilters = [],
    rangeFilters = [],
  } = req.body;

  try {
    const connection = await pool.getConnection();
    const [results, fields] = await connection.execute(sql);
    connection.release();
    console.log("Page", page);
    console.log("exactFilters", exactFilters);
    //
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

    console.log("Filters:", filters);

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
          const itemValue = item[key]?.toLowerCase();
          return !filterValue || itemValue.includes(filterValue?.toLowerCase());
        }
        //* Filter to simplify letters
        // else if (typeof filterValue === "string") {
        //   if (typeof str !== "string") return "";
        //   const normalizeString = (str) =>
        //     str
        //       .normalize("NFD")
        //       .replace(/[\u0300-\u036f]/g, "")
        //       .toLowerCase();

        //   const itemValue = normalizeString(item[key]?.toString());
        //   const normalizedFilterValue = normalizeString(filterValue);

        //   return !filterValue || itemValue.includes(normalizedFilterValue);
        // }
        else {
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

    res.status(200).json({
      products: paginatedData || [],
      totalProducts: (filteredData && filteredData?.length) || 0,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal error of server" });
  }
};

const filterDataCongresoByCache = async (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    body = {},
    exactFilters = [],
    rangeFilters = [],
  } = req.body;
  console.log("Page", page);
  console.log("exactFilters", exactFilters);

  const offset = (page - 1) * pageSize;

  const cacheKey = "congreso_data";

  let results = cache.get(cacheKey);

  if (!results) {
    console.log("Cache miss!");
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

  console.log("Filters:", filters);

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
        return !filterValue || itemValue.includes(filterValue?.toLowerCase());
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

  res.status(200).json({
    products: paginatedData || [],
    totalProducts: (filteredData && filteredData.length) || 0,
  });
};

module.exports = {
  getDataCongreso,
  filterDataCongreso,
  getDataDistinct,
  filterDataCongresoByCache,
};
