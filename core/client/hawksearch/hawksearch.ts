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

interface Links {
      type: 'links';
      title: string;
      links: Array<{ label: string; href: string }>;
};

interface Products {
  type: 'products';
  title: string;
  products: Array<{
    id: string;
    title: string;
    href: string;
    price?: string;
    image?: { src: string; alt: string };
  }>;
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
       const json:HawksearchSearchResponse = await response.json();
       const products = json.Results;
       const categoryFacet = json.Facets.find((facet) => facet.Name === 'Category');

       if(!categoryFacet)
          return null;
        
       const categoryResponse:Links = {
          type: 'links',
          title: "Categories",
          links: categoryFacet.Values.map((category) => {
              return {
                  "label": category.Label,
                  "href": category.Value
              }
          })
        }

       const productResponse:Products = {
        type: 'products',
        title: "Products",
        products: products.map((product) => {
          return {
            id: product.DocId,
            title: product.Document.name[0] ?? '',
            href: product.Document.url_detail[0] ?? '',
            image: {
                src: product.Document.image[0] ?? '',
                alt: ""
            },
            price: `$${parseFloat((product.Document.price_retail[0] ?? '')).toFixed(2)}`
          }
        })
      }

      return [categoryResponse, productResponse];
    }
  } catch (error) {
    console.error(error);
    return null;
  }

  return null;
}
