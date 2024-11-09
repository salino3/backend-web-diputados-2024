const { GraphQLObjectType, GraphQLString } = require("graphql");

const CongresoModel = new GraphQLObjectType({
  name: "Question",
  fields: {
    Expediente: { type: GraphQLString },
    Contenido: { type: GraphQLString },
    Presentada: { type: GraphQLString },
    Calificada: { type: GraphQLString },
    diputados_autores: { type: GraphQLString },
    Grupo_Parlamentario: { type: GraphQLString },
    comunidades_tags: { type: GraphQLString },
    provincia_tags: { type: GraphQLString },
    municipios_tags: { type: GraphQLString },
  },
});

module.exports = CongresoModel;
