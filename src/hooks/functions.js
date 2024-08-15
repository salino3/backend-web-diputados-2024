const normalizeString = (str) => {
  if (typeof str !== "string") return "";

  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

module.exports = {
  normalizeString,
};

// else if (typeof filterValue === "string") {
//     const itemValue = normalizeString(item[key]?.toString());
//     console.log("ITEM", itemValue);
//     const normalizedFilterValue = normalizeString(filterValue);
//     return !filterValue || itemValue.includes(normalizedFilterValue);
//   }
