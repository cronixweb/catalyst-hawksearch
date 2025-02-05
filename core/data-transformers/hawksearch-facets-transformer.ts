/* eslint-disable complexity */
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import {
  fetchFacetedHawksearch,
  PublicSearchParamsSchema,
  PublicToPrivateParams,
} from '~/client/hawksearch/fetch-faceted-hawksearch';
import { ExistingResultType } from '~/client/util';

export const facetsTransformer = async ({
  refinedFacets,
  allFacets,
  searchParams,
}: {
  refinedFacets: ExistingResultType<typeof fetchFacetedHawksearch>['facets']['items'];
  allFacets: ExistingResultType<typeof fetchFacetedHawksearch>['facets']['items'];
  searchParams: z.input<typeof PublicSearchParamsSchema>;
}) => {
  const t = await getTranslations('FacetedGroup.FacetedSearch.Facets');
  const { filters } = PublicToPrivateParams.parse(searchParams);

  return allFacets.map((facet) => {
    const refinedFacet = refinedFacets.find((f) => f.name === facet.name);

    if (facet.__typename === 'CategorySearchFilter') {
      const refinedCategorySearchFilter =
        refinedFacet?.__typename === 'CategorySearchFilter' ? refinedFacet : null;

      return {
        type: 'toggle-group' as const,
        paramName: 'categoryIn',
        label: facet.name,
        defaultCollapsed: facet.isCollapsedByDefault,
        options: facet.categories.map((category) => {
          const refinedCategory = refinedCategorySearchFilter?.categories.find(
            (c) => c.entityId === category.entityId,
          );
          const isSelected = filters.categoryEntityIds?.includes(category.entityId) === true;

          return {
            label: category.name,
            value: category.entityId.toString(),
            disabled: refinedCategory == null && !isSelected,
          };
        }),
      };
    }

    if (facet.__typename === 'PriceSearchFilter') {
      const refinedPriceSearchFilter =
        refinedFacet?.__typename === 'PriceSearchFilter' ? refinedFacet : null;
      const isSelected = filters.price?.minPrice != null || filters.price?.maxPrice != null;

      return {
        type: 'range' as const,
        minParamName: 'minPrice',
        maxParamName: 'maxPrice',
        label: facet.name,
        min: facet.selected?.minPrice ?? undefined,
        max: facet.selected?.maxPrice ?? undefined,
        disabled: refinedPriceSearchFilter == null && !isSelected,
      };
    }

    return null;
  });
};
