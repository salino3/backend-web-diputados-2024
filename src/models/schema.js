const {
  GraphQLObjectType,
  GraphQLList,
  GraphQLInt,
  GraphQLString,
  GraphQLSchema,
} = require("graphql");
const ResponseType = require("./congreso.response");
const {
  filterDataCongresoByCache,
} = require("../controllers/congreso.controller");
const CongresoInputType = require("./congreso.input");

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    questions: {
      type: ResponseType,
      args: {
        page: { type: GraphQLInt },
        pageSize: { type: GraphQLInt },
        body: { type: CongresoInputType },
        exactFilters: { type: new GraphQLList(GraphQLString) },
        rangeFilters: { type: new GraphQLList(GraphQLString) },
      },
      resolve: async (
        _,
        {
          page = 1,
          pageSize = 10,
          body = {},
          exactFilters = [],
          rangeFilters = [],
        }
      ) => {
        try {
          const { products, totalProducts } = await filterDataCongresoByCache({
            page,
            pageSize,
            body,
            exactFilters,
            rangeFilters,
          });
          return { products, totalProducts };
        } catch (error) {
          console.error("Error resolving questions:", error);
          throw new Error("Failed to fetch and filter questions data.");
        }
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
});
