const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} = require("graphql");

const CongresoModel = new GraphQLObjectType({
  name: "Question",
  fields: {
    Expediente: { type: GraphQLString },
    Contenido: { type: GraphQLString },
    Presentada: { type: GraphQLString },
    diputados_autores: { type: GraphQLString },
    Grupo_Parlamentario: { type: GraphQLString },
    comunidades_tags: { type: GraphQLString },
    provincia_tags: { type: GraphQLString },
    municipios_tags: { type: GraphQLString },
    url: { type: GraphQLString },
  },
});

//
const ResponseType = new GraphQLObjectType({
  name: "ResponseType",
  fields: {
    products: { type: new GraphQLList(CongresoModel) },
    totalProducts: { type: GraphQLInt },
  },
});

module.exports = { CongresoModel, ResponseType };
