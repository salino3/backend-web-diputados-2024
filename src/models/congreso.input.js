const {
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLList,
} = require("graphql");

const PresentadaInputType = new GraphQLInputObjectType({
  name: "PresentadaInputType",
  fields: {
    min: { type: GraphQLString },
    max: { type: GraphQLString },
  },
});

const CongresoInputType = new GraphQLInputObjectType({
  name: "CongresoInputType",
  fields: {
    Expediente: { type: GraphQLString },
    Contenido: { type: GraphQLString },
    Presentada: { type: PresentadaInputType },
    diputados_autores: { type: new GraphQLList(GraphQLString) },
    Grupo_Parlamentario: { type: new GraphQLList(GraphQLString) },
    comunidades_tags: { type: new GraphQLList(GraphQLString) },
    provincia_tags: { type: new GraphQLList(GraphQLString) },
    municipios_tags: { type: new GraphQLList(GraphQLString) },
  },
});

module.exports = CongresoInputType;
