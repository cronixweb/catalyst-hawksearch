import { cache } from 'react';
import { z } from 'zod';
import { facetedHawkSearch } from '~/client/hawksearch/faceted-hawksearch';

const getProductSearchResults = cache(
  async ({after, before, sort, filters }: any) => {
    
    return  await facetedHawkSearch( after, before, sort, filters);
  },
);

const SearchParamSchema = z.union([z.string(), z.array(z.string()), z.undefined()]);

const SearchParamToArray = SearchParamSchema.transform((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value !== '') {
    return [value];
  }

  return undefined;
});

const PrivateSortParam = z.union([
  z.literal('A_TO_Z'),
  z.literal('BEST_REVIEWED'),
  z.literal('BEST_SELLING'),
  z.literal('FEATURED'),
  z.literal('HIGHEST_PRICE'),
  z.literal('LOWEST_PRICE'),
  z.literal('NEWEST'),
  z.literal('RELEVANCE'),
  z.literal('Z_TO_A'),
]);

const PublicSortParam = z.string().toUpperCase().pipe(PrivateSortParam);

const SearchProductsFiltersInputSchema = z.object({
  brandEntityIds: z.array(z.number()).nullish(),
  categoryEntityId: z.string().nullish(),
  categoryEntityIds: z.array(z.string()).nullish(),
  hideOutOfStock: z.boolean().nullish(),
  isFeatured: z.boolean().nullish(),
  isFreeShipping: z.boolean().nullish(),
  price: z
    .object({
      maxPrice: z.number().nullish(),
      minPrice: z.number().nullish(),
    })
    .nullish(),
  productAttributes: z
    .array(
      z.object({
        attribute: z.string(),
        values: z.array(z.string()),
      }),
    )
    .nullish(),
  rating: z
    .object({
      maxRating: z.number().nullish(),
      minRating: z.number().nullish(),
    })
    .nullish(),
  searchSubCategories: z.boolean().nullish(),
  searchTerm: z.string().nullish(),
});

const PrivateSearchParamsSchema = z.object({
  after: z.string().nullish(),
  before: z.string().nullish(),
  limit: z.number().nullish(),
  sort: PrivateSortParam.nullish(),
  filters: SearchProductsFiltersInputSchema,
});

export const PublicSearchParamsSchema = z.object({
  after: z.string().nullish(),
  before: z.string().nullish(),
  brand: SearchParamToArray.nullish().transform((value) => value?.map(Number)),
  category: z.coerce.string().optional(),
  categoryIn: SearchParamToArray.nullish().transform((value) => value?.map(String)),
  isFeatured: z.coerce.boolean().nullish(),
  limit: z.coerce.number().nullish(),
  minPrice: z.coerce.number().nullish(),
  maxPrice: z.coerce.number().nullish(),
  minRating: z.coerce.number().nullish(),
  maxRating: z.coerce.number().nullish(),
  sort: PublicSortParam.nullish(),
  // In the future we should support more stock filters, e.g. out of stock, low stock, etc.
  stock: SearchParamToArray.nullish().transform((value) =>
    value?.filter((stock) => z.enum(['in_stock']).safeParse(stock).success),
  ),
  // In the future we should support more shipping filters, e.g. 2 day shipping, same day, etc.
  shipping: SearchParamToArray.nullish().transform((value) =>
    value?.filter((stock) => z.enum(['free_shipping']).safeParse(stock).success),
  ),
  term: z.string().nullish(),
});

const AttributeKey = z.custom<`attr_${string}`>((val) => {
  return typeof val === 'string' ? /^attr_\w+$/.test(val) : false;
});

export const PublicToPrivateParams = PublicSearchParamsSchema.catchall(SearchParamToArray.nullish())
  .transform((publicParams) => {
    const { after, before, limit, sort, ...filters } = publicParams;

    const {
      brand,
      category,
      categoryIn,
      isFeatured,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      term,
      shipping,
      stock,
      // There is a bug in Next.js that is adding the path params to the searchParams. We need to filter out the slug params for now.
      // https://github.com/vercel/next.js/issues/51802
      slug,
      ...additionalParams
    } = filters;

    // Assuming the rest of the params are product attributes for now. We need to see if we can get the GQL endpoint to ingore unknown params.
    const productAttributes = Object.entries(additionalParams)
      .filter(([attribute]) => AttributeKey.safeParse(attribute).success)
      .filter(([, values]) => values != null)
      .map(([attribute, values]) => ({
        attribute: attribute.replace('attr_', ''),
        values,
      }));

    return {
      after,
      before,
      limit,
      sort,
      filters: {
        brandEntityIds: brand,
        categoryEntityId: category,
        categoryEntityIds: categoryIn,
        hideOutOfStock: stock?.includes('in_stock'),
        isFreeShipping: shipping?.includes('free_shipping'),
        isFeatured,
        price:
          minPrice || maxPrice
            ? {
                maxPrice,
                minPrice,
              }
            : undefined,
        productAttributes,
        rating:
          minRating || maxRating
            ? {
                maxRating,
                minRating,
              }
            : undefined,
        searchTerm: term,
      },
    };
  })
  .pipe(PrivateSearchParamsSchema);

export const fetchFacetedHawksearch = cache(
  // We need to make sure the reference passed into this function is the same if we want it to be memoized.
  async (params: z.input<typeof PublicSearchParamsSchema>) => {
    const { after, before, limit = 9, sort, filters } = PublicToPrivateParams.parse(params);

    return getProductSearchResults({
      after,
      before,
      limit,
      sort,
      filters,
    });
  },
);
