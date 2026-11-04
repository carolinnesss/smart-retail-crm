import { z } from 'zod';

export const CustomerTypeEnum = z.enum(['Warung / Grosir', 'Eceran']);
export const PaymentMethodEnum = z.enum(['TUNAI', 'KASBON']);

// Customer Schemas
export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Nama pelanggan minimal 2 karakter'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit'),
  address: z.string().optional().default(''),
  customer_type: CustomerTypeEnum.default('Eceran'),
  max_credit_limit: z.number().min(0, 'Limit kredit tidak boleh negatif').default(0),
  is_active: z.boolean().default(true),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// Product Schemas
export const CreateProductBaseSchema = z.object({
  sku: z.string().min(1, 'SKU / Barcode wajib diisi'),
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  unit: z.string().min(1, 'Satuan produk wajib diisi'),
  retail_price: z.number().positive('Harga eceran harus lebih besar dari 0'),
  wholesale_price: z.number().positive('Harga grosir harus lebih besar dari 0'),
  stock_quantity: z.number().min(0, 'Stok barang tidak boleh negatif'),
  min_stock_alert: z.number().min(0, 'Batas peringatan stok tidak boleh negatif').default(5),
  is_active: z.boolean().default(true),
});

export const CreateProductSchema = CreateProductBaseSchema.refine(
  (data) => data.wholesale_price <= data.retail_price,
  {
    message: 'Harga grosir tidak boleh lebih besar dari harga eceran.',
    path: ['wholesale_price'],
  }
);

export const UpdateProductSchema = CreateProductBaseSchema.partial();

// Transaction Item Schema
export const CreateTransactionItemSchema = z.object({
  product_id: z.string().min(1, 'ID produk wajib diisi'),
  quantity: z.number().positive('Kuantitas harus lebih besar dari 0'),
  unit_price: z.number().positive('Harga satuan harus lebih besar dari 0'),
  price_type: z.enum(['retail', 'wholesale']).default('retail'),
});

// Transaction Checkout Schema
export const CreateTransactionSchema = z
  .object({
    customer_id: z.string().nullable().optional(),
    items: z.array(CreateTransactionItemSchema).min(1, 'Keranjang belanja minimal berisi 1 item'),
    discount_amount: z.number().min(0, 'Diskon tidak boleh negatif').optional().default(0),
    payment_method: PaymentMethodEnum,
    cash_amount: z.number().min(0, 'Nominal tunai tidak boleh negatif').optional().default(0),
    cash_tendered: z.number().min(0, 'Uang diterima tidak boleh negatif').optional(),
    change_amount: z.number().min(0, 'Kembalian tidak boleh negatif').optional().default(0),
    debt_amount: z.number().min(0, 'Nominal kasbon tidak boleh negatif').optional().default(0),
    due_date: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // Guest rules check: KASBON strictly requires registered customer
      if (data.payment_method === 'KASBON' && (!data.customer_id || data.customer_id.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Pembeli umum (walk-in) dilarang menggunakan metode bayar KASBON. Pilih pelanggan terdaftar.',
      path: ['customer_id'],
    }
  );

// Debt Payment Schema
export const CreateDebtPaymentSchema = z.object({
  customer_id: z.string().min(1, 'ID pelanggan wajib diisi'),
  payment_amount: z.number().positive('Nominal pembayaran cicilan harus lebih besar dari Rp 0'),
  transaction_id: z.string().nullable().optional(),
  notes: z.string().optional(),
});
