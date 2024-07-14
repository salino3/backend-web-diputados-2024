const { pool } = require("../../db");

const getDataCongreso = async (req, res) => {
  const sql = "SELECT * FROM congreso_preguntas LIMIT 10";
  try {
    const connection = await pool.getConnection();
    const [results, fields] = await connection.execute(sql);
    connection.release();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  getDataCongreso,
};
