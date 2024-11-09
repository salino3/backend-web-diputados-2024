const {
  GraphQLObjectType,
  GraphQLList,
  GraphQLInt,
  GraphQLString,
} = require("graphql");
const CongresoModel = require("./congreso.model");

const ResponseType = new GraphQLObjectType({
  name: "ResponseType",
  fields: {
    products: { type: new GraphQLList(CongresoModel) },
    totalProducts: { type: GraphQLInt },
  },
});

module.exports = ResponseType;
