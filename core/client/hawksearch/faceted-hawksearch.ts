interface Pagination{
    NofResults: number;
    CurrentPage: number;
    MaxPerPage: number;
    NofPages: number;
  }
  
  interface HawkSearchDocument {
    image: string[];
    unique_id: string[];
    price_retail: number[];
    name: string[];
    url_detail: string[];
    metric_inventory: number[];
  }
  
  interface Result {
    DocId: string;
    Score: number;
    Document: HawkSearchDocument;
    IsVisible: boolean;
  }
  
  interface HawksearchSearchResponse{
    Pagination: Pagination;
    Results: Result[];
    Facets: HawksearchFacet[];
  }
  
  interface HawksearchFacet{
    Name: string;
    Values: HawksearchFacetValues[];
  }

  interface HawksearchFacetValues{
    Value: string;
    Selected: boolean;
    Label: string;
    Count: number;
    Children: HawksearchFacetValues[];
    RangeStart: number;
    RangeEnd: number;
  }

  export interface HawksearchFilters{
    categoryEntityIds?: string[] | null | undefined;
    searchTerm?: string | null | undefined;
    price?: {
      minPrice?: number | null | undefined;
      maxPrice?: number | null | undefined;
    } | null | undefined
  }

    interface facetedHawksearchResults {
      facets: {
          items: Array<({
              __typename: "PriceSearchFilter";
              name: string;
              isCollapsedByDefault: boolean;
              selected: {
                  minPrice: number | null;
                  maxPrice: number | null;
              } | null;
          } | {
              categories: Array<{
                  entityId: string;
                  name: string;
                  isSelected: boolean;
                  productCount: number;
                  subCategories: {
                      edges: Array<{
                        node: {
                          entityId: string,
                          name: string,
                          isSelected: boolean,
                          productCount: number
                        }
                      }> | null;
                  };
              }>;
              __typename: "CategorySearchFilter";
              name: string;
              isCollapsedByDefault: boolean;
              displayProductCount: boolean;
          })>;
      };
      products: {
          collectionInfo: {
              totalItems: number | null;
          } | null;pageInfo: {
              hasNextPage: boolean;hasPreviousPage: boolean;startCursor: string | null;endCursor: string | null;
          };
          items: Array<{
              entityId: string;
              name: string;
              defaultImage: {
                  altText: string;url: string;
              } | null;
              path: string;
              brand: {
                  name: string;path: string;
              } | null;
              reviewSummary: {
                  numberOfReviews: number;averageRating: number;
              };
              productOptions: {
                  edges: Array<{
                      node: {
                          __typename ? : "CheckboxOption" | undefined;entityId: string;
                      } | {
                          __typename ? : "DateFieldOption" | undefined;entityId: string;
                      } | {
                          __typename ? : "FileUploadFieldOption" | undefined;entityId: string;
                      } | {
                          __typename ? : "MultiLineTextFieldOption" | undefined;entityId: string;
                      } | {
                          __typename ? : "MultipleChoiceOption" | undefined;entityId: string;
                      } | {
                          __typename ? : "NumberFieldOption" | undefined;entityId: string;
                      } | {
                          __typename ? : "TextFieldOption" | undefined;entityId: string;
                      };
                  }> | null;
              };
              inventory: {
                  isInStock: boolean;
              };
              availabilityV2: {
                  __typename ? : "ProductAvailable" | undefined;status: string;
              } | {
                  __typename ? : "ProductPreOrder" | undefined;status: string;
              } | {
                  __typename ? : "ProductUnavailable" | undefined;status: string;
              };
              prices: {
                  price: {
                      value: number;currencyCode: string;
                  };basePrice: {
                      value: number;currencyCode: string;
                  } | null;retailPrice: {
                      value: number;currencyCode: string;
                  } | null;salePrice: {
                      value: number;currencyCode: string;
                  } | null;priceRange: {
                      min: {
                          value: number;currencyCode: string;
                      };max: {
                          value: number;currencyCode: string;
                      };
                  };
              } | null;
          }>;
      };
  }

  export async function facetedHawkSearch(after:string | null | undefined, before:string | null | undefined, sort:string | null | undefined, filters: HawksearchFilters): 
  Promise<facetedHawksearchResults>
  
  {
  
    if (!process.env.HAWKSEARCH_SERVER?.includes('hawksearch')) {
      throw new Error('Invalid Hawksearch Server');
    }
  
    if (process.env.HAWKSEARCH_CLIENT_GUID === '') {
      throw new Error('HAWKSEARCH_CLIENT_GUID is empty');
    }
  
    if (process.env.HAWKSEARCH_INDEX === '') {
      throw new Error('HAWKSEARCH_INDEX is empty');
    }
      const response = await fetch(`${process.env.HAWKSEARCH_SERVER}/api/v2/search`, {
        method: 'POST',
        body: JSON.stringify({
          ClientGuid: process.env.HAWKSEARCH_CLIENT_GUID,
          IndexName: process.env.HAWKSEARCH_INDEX,
          Keyword: filters.searchTerm,
          PageNo: after || before,
          SortBy: sort,
          FacetSelections: {
            category: filters.categoryEntityIds,
            ...(filters.price && {
              price_retail: [
                `${(filters.price.minPrice ? filters.price.minPrice : 0 )},${(filters.price.maxPrice ? filters.price.maxPrice : '')}`
              ]
          }),
          },
        }),
        headers: {
          'Content-Type': 'text/json',
          'Accept' : 'application/json'
        }
      });
      //console.log(response);
      console.log('STATUS******************* ', response.status);
      
         const hawkSearchResponse:HawksearchSearchResponse = await response.json();

         const products = hawkSearchResponse.Results;
  
         const items = products.map((product) => {
            return {
                entityId: product.DocId,
                name: product.Document.name[0] ?? '',
                defaultImage: {
                    altText: '',
                    url: product.Document.image[0] ?? '',
                },
                path: product.Document.url_detail[0] ?? '',
                brand: null,
                reviewSummary: { numberOfReviews: 0, averageRating: 0 },
                productOptions: { edges: [ { node: { entityId: product.DocId } } ] },
                inventory: { isInStock: (product.Document.metric_inventory[0] ?  product.Document.metric_inventory[0] > 0 : false)},
                availabilityV2: { status: product.IsVisible ? 'Available' : 'Unavailable'},
                prices: {
                    price: { value: product.Document.price_retail[0] ?? 0, currencyCode: 'USD' },
                    basePrice: { value: product.Document.price_retail[0] ?? 0, currencyCode: 'USD' },
                    retailPrice: null,
                    salePrice: null,
                    priceRange: {
                        min: { value: product.Document.price_retail[0] ?? 0, currencyCode: 'USD' },
                        max: { value: product.Document.price_retail[0] ?? 0, currencyCode: 'USD' }
                    }
                }
            }
         });

         const facets = hawkSearchResponse.Facets;
         const pagination = hawkSearchResponse.Pagination;

         return {
            facets: {
              items: facets.map((facet) => {
                switch (facet.Name) {
                  case 'Category':
                    return {
                        displayProductCount: true,
                        isCollapsedByDefault: false,
                        name: "Category",
                        __typename: "CategorySearchFilter",
                        categories: 
                        
                          facet.Values.map((category) => {
                            return {
                                entityId: category.Value,
                                isSelected: category.Selected,
                                name: category.Label,
                                productCount: category.Count,
                                subCategories: {
                                  edges: 
                                  (category.Children.map((subCategory) => {
                                    return {
                                      node: {
                                        entityId: subCategory.Label,
                                        name: subCategory.Label,
                                        isSelected: subCategory.Selected,
                                        productCount: subCategory.Count
                                      }
                                    }
                                  })
                                  )
                                }
                            }
                        })
                    };
                  case 'Price':
                    return {
                        __typename: "PriceSearchFilter",
                        name: "Price",
                        isCollapsedByDefault: false,
                        selected:{ 
                          minPrice: facet.Values[0]?.RangeStart ? facet.Values[0].RangeStart : null,
                          maxPrice: facet.Values[0]?.RangeEnd ? facet.Values[0].RangeEnd: null
                        }
                      }
                  
                  default :
                    return {
                      __typename: "PriceSearchFilter",
                      name: "Price",
                      isCollapsedByDefault: false,
                      selected:{ 
                        minPrice: null,
                        maxPrice: null
                      }
                    }
                }
              }),
            },
            products: {
              collectionInfo: {
                totalItems: pagination.NofResults,
              },
              pageInfo: {
                endCursor: String(pagination.CurrentPage + 1),
                hasNextPage: pagination.CurrentPage < pagination.NofPages,
                hasPreviousPage: pagination.CurrentPage > 1,
                startCursor: String(pagination.CurrentPage - 1)
              },
              items,
            },
          };
  }
  