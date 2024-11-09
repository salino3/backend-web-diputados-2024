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

  res.status(200).json({
    products: paginatedData || [],
    totalProducts: (filteredData && filteredData.length) || 0,
  });
};

module.exports = {
  filterDataCongresoByCache,
};
