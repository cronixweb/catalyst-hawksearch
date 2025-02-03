import { SearchResult } from "@/vibes/soul/primitives/navigation";

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

export async function hawkSearch(query: string) : Promise<SearchResult[] | null> {

  if (!process.env.HAWKSEARCH_SERVER?.includes('hawksearch')) {
    throw new Error('Invalid Hawksearch Server');
  }

  if (process.env.HAWKSEARCH_CLIENT_GUID === '') {
    throw new Error('HAWKSEARCH_CLIENT_GUID is empty');
  }

  if (process.env.HAWKSEARCH_INDEX === '') {
    throw new Error('HAWKSEARCH_INDEX is empty');
  }

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
       const categoryFacet = json.Facets.find((facet: any) => facet.Name === 'Category');

       const categoryResponse = {
          type: 'links' as 'links',
          title: "Categories",
          links: categoryFacet.Values.map((category: any) => {
              return {
                  "label": category.Label,
                  "href": category.Value
              }
          }) as Array<{ label: string; href: string }>
        }

       const productResponse = {
        type: 'products' as 'products',
        title: "Products",
        products: products.map((product: any) => {
          return {
            id: product.DocId,
            title: product.Document.name.length >=1 ? product.Document.name[0] : '',
            href: product.Document.url_detail.length >=1 ? product.Document.url_detail[0] : '',
            image: {
                src: product.Document.image.length >=1 ? product.Document.image[0] : '',
                alt: ""
            },
            price: `$${parseFloat((product.Document.price_retail.length >=1 ? product.Document.price_retail[0] : '')).toFixed(2)}`
          }
        }) as Array<{
                id: string;
                title: string;
                href: string;
                price?: string;
                image?: { src: string; alt: string };
              }>
      }
       ;

      return [categoryResponse, productResponse];
    }
  } catch (error) {
    console.error(error);
    return null;
  }

  return null;
}
