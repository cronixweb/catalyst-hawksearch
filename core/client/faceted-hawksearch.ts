interface Pagination{
    NofResults: number;
    CurrentPage: number;
    MaxPerPage: number;
    NofPages: number;
  }
  
  interface HawkSearchDocument {
    image: string[];
    unique_id: string[];
    price_retail: string[];
    
  }
  
  interface Result {
    DocId: string;
    Score: number;
    Document: HawkSearchDocument;
  }
  
  interface HawksearchSearchResponse{
    Pagination: Pagination;
    Results: Result[];
  }
  

  interface Filters{
    categoryEntityIds: string[];
    searchTerm: string;
    price: {
      minPrice: string,
      maxPrice: string
    }
  }

  export async function facetedHawkSearch(limit = 9, after, before, sort, filters: Filters) {
  
    console.log(process.env.HAWKSEARCH_SERVER)
    console.log({limit, after, before, sort, filters});
    console.log(filters.categoryEntityIds);

    if (!process.env.HAWKSEARCH_SERVER?.includes('hawksearch')) {
      throw new Error('Invalid Hawksearch Server');
    }
  
    if (process.env.HAWKSEARCH_CLIENT_GUID === '') {
      throw new Error('HAWKSEARCH_CLIENT_GUID is empty');
    }
  
    if (process.env.HAWKSEARCH_INDEX === '') {
      throw new Error('HAWKSEARCH_INDEX is empty');
    }
  
    console.log(process.env.HAWKSEARCH_CLIENT_GUID, ' ' ,process.env.HAWKSEARCH_INDEX);
  
    const price_retail = filters.price ? 
    [
      (filters.price.minPrice ? filters.price.minPrice : 0 )
      + ',' 
      + (filters.price.maxPrice ? filters.price.maxPrice : '')
    ] : [];

    console.log(price_retail);

    try {
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
                    (filters.price.minPrice ? filters.price.minPrice : 0 )
                    + ',' 
                    + (filters.price.maxPrice ? filters.price.maxPrice : '')
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
      
      if (response.status === 200) {
         const hawkSearchResponse = await response.json();
         console.log(hawkSearchResponse);

         const products = hawkSearchResponse.Results;
  
         const items = products.map((product:any, index:any) => {
            return {
                entityId: product.DocId,
                name: product.Document.name.length >=1 ? product.Document.name[0] : '',
                defaultImage: {
                    altText: '',
                    url: product.Document.image.length >=1 ? product.Document.image[0] : '',
                },
                path: product.Document.url_detail.length >=1 ? product.Document.url_detail[0] : '',
                brand: null,
                reviewSummary: { numberOfReviews: 0, averageRating: 0 },
                productOptions: { edges: [ { node: { entityId: product.DocId } } ] },
                inventory: { isInStock: product.Document.metric_inventory.length >=1 && product.Document.metric_inventory[0] > 0 },
                availabilityV2: { status: product.IsVisible ? 'Available' : 'Unavailable'},
                prices: {
                    price: { value: product.Document.price_retail.length >=1 ? product.Document.price_retail[0] : '', currencyCode: 'USD' },
                    basePrice: { value: product.Document.price_retail.length >=1 ? product.Document.price_retail[0] : '', currencyCode: 'USD' },
                    retailPrice: null,
                    salePrice: null,
                    priceRange: {
                        min: { value: product.Document.price_retail.length >=1 ? product.Document.price_retail[0] : '', currencyCode: 'USD' },
                        max: { value: product.Document.price_retail.length >=1 ? product.Document.price_retail[0] : '', currencyCode: 'USD' }
                    }
                }
            }
         });

         const facets = hawkSearchResponse.Facets;
         const pagination = hawkSearchResponse.Pagination;
         return {
            facets: {
              items: facets.map((facet: any) => {
                switch (facet.Name) {
                  case 'BrandSearchFilter':
                    return {
                      //...node,
                      //brands: removeEdgesAndNodes(node.brands),
                    };
      
                  case 'Category':
                    return {
                        displayProductCount: true,
                        isCollapsedByDefault: false,
                        name: "Category",
                        __typename: "CategorySearchFilter",
                        categories: 
                        
                        facet.Values.map((category: any) => {
                            return {
                                entityId: category.Value,
                                isSelected: category.Selected,
                                name: category.Label,
                                productCount: category.Count,
                                SubCategories: {
                                    // pageInfo: {
                                    //     "hasNextPage": false,
                                    //     "hasPreviousPage": false,
                                    //     "startCursor": "YXJyYXljb25uZWN0aW9uOjA=",
                                    //     "endCursor": "YXJyYXljb25uZWN0aW9uOjE="
                                    // },
                                    edges: 
                                    (category.Children && category.Children.map((subCategory: any) => {
                                      return {
                                        node: {
                                          "entityId": subCategory.Label,
                                          "name": subCategory.Label,
                                          "isSelected": subCategory.Selected,
                                          "productCount": subCategory.Count
                                        }
                                      }
                                    })
                                  )
                                }
                            }
                        })
                    };
      
                  case 'ProductAttributeSearchFilter':
                    return {
                      //...node,
                      //attributes: removeEdgesAndNodes(node.attributes),
                    };
      
                  case 'RatingSearchFilter':
                    return {
                      //...node,
                      //ratings: removeEdgesAndNodes(node.ratings),
                    };
    
                  case 'Price':
                    return {
                        "__typename": "PriceSearchFilter",
                        "name": "Price",
                        "isCollapsedByDefault": false,
                        "selected":{ 
                          "minPrice": facet.Values[0].RangeStart ? facet.Values[0].RangeStart : null,
                          "maxPrice": facet.Values[0].RangeEnd ? facet.Values[0].RangeEnd: null
                        }
                      }

                  default:
                    return {
                      // "__typename": "OtherSearchFilter",
                      // "name": "Other",
                      // "isCollapsedByDefault": true,
                      // "displayProductCount": true,
                      // "freeShipping": null,
                      // "isFeatured": null,
                      // "isInStock": {
                      //     "isSelected": facet.isInStock.isSelected,
                      //     "productCount": facet.
                      // }
                  };
                }
              }),
            },
            products: {
              collectionInfo: {
                totalItems: pagination.NofResults,
              },
              pageInfo: {
                endCursor: pagination.CurrentPage + 1,
                hasNextPage: pagination.CurrentPage < pagination.NofPages,
                hasPreviousPage: pagination.CurrentPage > 1,
                startCursor: pagination.CurrentPage - 1.
              },
              items,
            },
          };
  
      }
    } catch (error) {
      console.error(error);
    }
  }
  