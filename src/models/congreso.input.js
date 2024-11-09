const { GraphQLInputObjectType, GraphQLString } = require("graphql");

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
    Calificada: { type: GraphQLString },
    diputados_autores: { type: GraphQLString },
    Grupo_Parlamentario: { type: GraphQLString },
    comunidades_tags: { type: GraphQLString },
    provincia_tags: { type: GraphQLString },
    municipios_tags: { type: GraphQLString },
  },
});

module.exports = CongresoInputType;
