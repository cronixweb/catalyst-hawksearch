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

export async function hawkSearch(query: string) {

  console.log(process.env.HAWKSEARCH_SERVER)
  console.log(query);
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

  try {
    const response = await fetch(`${process.env.HAWKSEARCH_SERVER}/api/v2/search`, {
      method: 'POST',
      body: JSON.stringify({
        ClientGuid: process.env.HAWKSEARCH_CLIENT_GUID,
        IndexName: process.env.HAWKSEARCH_INDEX,
        Keyword: query,
      }),
      headers: {
        'Content-Type': 'text/json',
        'Accept' : 'application/json'
      }
    });
    console.log('STATUS******************* ', response.status);

    if (response.status === 200) {
       const json = await response.json();
       const products = json.Results;

       console.log(products);

       const preparedResponse = products.map((product:any, index:any) => {
          return {
              categories: {
                  edges: product.Document.category && product.Document.category.map((val:string, index:any) => {
                    val = val.split('|', 2)[1] as string;
                    return { node: { name: val, /** path: 'slug-not-found'*/ } }
                  })
              },
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

    
       console.log('*******************Hawsearch Products*******************');
       console.log(preparedResponse);
       console.log('*******************Hawsearch Products End*******************');

       return {
          status: 'success',
          data: {
            products: preparedResponse
          },
        };
      //  console.log('*******************Hawsearch Products*******************')
      //  console.log(products)
      //  console.log('*******************Hawsearch Products End*******************')
    }
  } catch (error) {
    console.error(error);
  }
}
