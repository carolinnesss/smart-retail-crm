import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireCustomer, handleAuthError, AuthError } from '@/lib/auth/guards';
import { INITIAL_STORE_SETTINGS } from '@/lib/mock-data';
import {
  extractCatalogCategories,
  projectCatalogForCustomer,
} from '@/lib/customer-catalog';
import { normalizeIndonesianPhone } from '@/lib/whatsapp';
import { CustomerType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireCustomer();
    const repo = getRepository();

    let customerType: CustomerType = 'Eceran';
    if (session.customerId) {
      const customer = await repo.getCustomerById(session.customerId);
      if (customer?.customer_type === 'Warung / Grosir') {
        customerType = 'Warung / Grosir';
      }
    }

    const [products, storeSettings] = await Promise.all([
      repo.getProducts(),
      repo.getStoreSettings().catch(() => INITIAL_STORE_SETTINGS),
    ]);

    const catalogProducts = projectCatalogForCustomer(products, customerType);
    const categories = extractCatalogCategories(catalogProducts);

    return NextResponse.json({
      success: true,
      data: {
        customer_type: customerType,
        store: {
          store_name: storeSettings.store_name,
          owner_name: storeSettings.owner_name,
          phone: storeSettings.phone,
          whatsapp_phone: normalizeIndonesianPhone(storeSettings.phone),
          address: storeSettings.address,
        },
        categories,
        products: catalogProducts,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      {
        success: false,
        error:
          (error as { message?: string })?.message ||
          'Gagal memuat katalog produk toko',
      },
      { status: 500 }
    );
  }
}
