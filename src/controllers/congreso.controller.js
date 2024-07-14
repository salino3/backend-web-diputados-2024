const getDataCongreso = (req, res) => {
  try {
    return res.status(200).json({ message: "hola" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getDataCongreso,
};
