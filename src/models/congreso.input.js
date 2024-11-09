const { GraphQLInputObjectType, GraphQLString } = require("graphql");

const CongresoInputType = new GraphQLInputObjectType({
  name: "CongresoInputType",
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

module.exports = CongresoInputType;
