const CongresoModel = sequelize.define("Expediente", {
  expediente: {
    type: DataTypes.STRING,
    primaryKey: true, // Definir como clave primaria
    allowNull: false,
    unique: true, // Debe ser único
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
});

module.exports = CongresoModel;
