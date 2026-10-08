// app/api/deals/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'sneakers';
  
  // Map internal categories to search terms
  const searchQueries: Record<string, string> = {
    sneakers: 'Jordan 1 Retro High OR Yeezy 350',
    laptops: 'ROG Zephyrus G16 OR Razer Blade',
    handhelds: 'Steam Deck OLED',
    streetwear: 'Supreme hoodie OR Fear of God Essentials',
  };

  const query = encodeURIComponent(searchQueries[category] || 'sneakers');

  try {
    // 1. Fetch OAuth Token
    const authHeader = Buffer.from(
      `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
    ).toString('base64');

    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      next: { revalidate: 3600 },
    });

    const { access_token } = await tokenRes.json();

    // 2. Fetch Live Listings
    const ebayRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&limit=12&filter=buyingOptions:{FIXED_PRICE}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        next: { revalidate: 900 }, // Cache on Netlify CDN for 15 mins
      }
    );

    const data = await ebayRes.json();
    return NextResponse.json(data.itemSummaries || []);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}
