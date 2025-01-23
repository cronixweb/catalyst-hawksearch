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
  if (!process.env.HAWKSEARCH_SERVER?.includes('hawksearch')) {
    throw new Error('Invalid Hawksearch Server');
  }

  if (process.env.HAWKSEARCH_CLIENT_GUID === '') {
    throw new Error('HAWKSEARCH_CLIENT_GUID is empty');
  }

  if (process.env.HAWKSEARCH_CLIENT_GUID === '') {
    throw new Error('HAWKSEARCH_INDEX is empty');
  }

  try {
    const response = await fetch(`${process.env.HAWKSEARCH_SERVER}/api/v2/search`, {
      method: 'POST',
      body: JSON.stringify({
        ClientGuid: process.env.HAWKSEARCH_CLIENT_GUID,
        IndexName: process.env.HAWKSEARCH_INDEX,
        Query: query,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept' : 'application/json'
      }
    });
    if (response.status === 200) {
       const json = await response.json();
       const products = json.Results
       console.log(products)
    }
  } catch (error) {
    console.error(error);
  }
}
