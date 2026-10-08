import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EPN_CAMPAIGN_ID = process.env.EPN_CAMPAIGN_ID || '5331234567';
const ALLOWED_SILHOUETTES = Array.from({ length: 14 }, (_, i) => `Air Jordan ${i + 1}`);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const modelParam = searchParams.get('model');
    const ogOnly = searchParams.get('og_only') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    let query = supabase
      .from('workspace_jordan_retros')
      .select('*')
      .in('silhouette', ALLOWED_SILHOUETTES)
      .limit(limit);

    if (modelParam) {
      const modelNum = parseInt(modelParam.replace(/\D/g, ''), 10);
      if (modelNum >= 1 && modelNum <= 14) {
        query = query.eq('silhouette', `Air Jordan ${modelNum}`);
      } else {
        return NextResponse.json(
          { error: 'Invalid model filter. Only models 1 through 14 are allowed.' },
          { status: 400 }
        );
      }
    }

    if (ogOnly) {
      query = query.eq('is_og_colorway', true);
    }

    const { data: products, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enrichedProducts = (products || []).map((product) => {
      const affiliateUrl = product.affiliate_url || 
        `https://rover.ebay.com/rover/1/711-53200-19255-0/1?mpt=${EPN_CAMPAIGN_ID}&customid=agent_nostalgia_30_50&mpre=${encodeURIComponent(product.product_url)}`;

      return {
        id: product.id,
        silhouette: product.silhouette,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
        affiliate_url: affiliateUrl,
        is_og_colorway: product.is_og_colorway,
        marketing_context: {
          target_demographic: 'Ages 30-50 (Millennials / Gen-X Nostalgia)',
          angle: 'Heritage, High Disposable Income Collector'
        }
      };
    });

    return NextResponse.json({
      count: enrichedProducts.length,
      demographic_scope: 'Air Jordan 1-14 Core Nostalgia Collectors (25-50)',
      products: enrichedProducts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: (err as Error).message },
      { status: 500 }
    );
  }
}
