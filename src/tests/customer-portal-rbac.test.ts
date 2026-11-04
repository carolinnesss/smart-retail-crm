import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataRepository } from '@/lib/repository/mock-repo';
import {
  authenticateCustomerAccount,
  validateCashierEndpointAccess,
  validateCustomerDataAccess,
  validateCustomerCreditLimitUpdatePermission,
} from '@/lib/auth/rbac-guard';

describe('Milestone: Peran ke-3 Pelanggan & Server-Side RBAC (Given / When / Then)', () => {
  let repo: MockDataRepository;

  beforeEach(async () => {
    repo = MockDataRepository.getInstance();
    await repo.resetMockData();
  });

  // --------------------------------------------------------------------------
  // Skenario 1: Pelanggan PENDING mencoba login -> Ditolak
  // --------------------------------------------------------------------------
  describe('Skenario 1: Pelanggan PENDING mencoba login', () => {
    it('Given akun baru didaftarkan dengan status PENDING, When mencoba login, Then login DITOLAK dengan pesan menunggu persetujuan', async () => {
      // Given: Akun baru didaftarkan
      const reg = await repo.registerCustomerAccount({
        name: 'Ahmad Pelanggan',
        whatsapp_number: '081234567891',
        password: 'password123',
      });
      expect(reg.status).toBe('PENDING');

      // When: Pelanggan mencoba login
      const loginResult = await authenticateCustomerAccount(repo, '081234567891', 'password123');

      // Then: Ditolak
      expect(loginResult.success).toBe(false);
      expect(loginResult.status).toBe(403);
      expect(loginResult.error).toContain('menunggu persetujuan');
      expect(loginResult.session).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 2: Pelanggan memanggil endpoint kasir langsung -> Ditolak (403)
  // --------------------------------------------------------------------------
  describe('Skenario 2: Pelanggan memanggil endpoint kasir langsung', () => {
    it('Given sesi aktif dengan peran CUSTOMER, When memanggil endpoint kasir apa pun, Then server menolak dengan HTTP 403 Forbidden', () => {
      const customerRole = 'CUSTOMER';

      // Uji berbagai endpoint kasir
      const posAccess = validateCashierEndpointAccess(customerRole, '/api/pos/checkout');
      expect(posAccess.isAllowed).toBe(false);
      expect(posAccess.statusCode).toBe(403);
      expect(posAccess.error).toContain('Akses ditolak');

      const crmAccess = validateCashierEndpointAccess(customerRole, '/api/customers');
      expect(crmAccess.isAllowed).toBe(false);
      expect(crmAccess.statusCode).toBe(403);

      const analyticsAccess = validateCashierEndpointAccess(customerRole, '/api/analytics');
      expect(analyticsAccess.isAllowed).toBe(false);
      expect(analyticsAccess.statusCode).toBe(403);

      const radarAccess = validateCashierEndpointAccess(customerRole, '/api/radar');
      expect(radarAccess.isAllowed).toBe(false);
      expect(radarAccess.statusCode).toBe(403);

      const approvalsAccess = validateCashierEndpointAccess(customerRole, '/api/approvals');
      expect(approvalsAccess.isAllowed).toBe(false);
      expect(approvalsAccess.statusCode).toBe(403);
    });

    it('Given sesi dengan peran CASHIER atau OWNER, When memanggil endpoint kasir, Then diizinkan', () => {
      expect(validateCashierEndpointAccess('CASHIER', '/api/pos/checkout').isAllowed).toBe(true);
      expect(validateCashierEndpointAccess('OWNER', '/api/pos/checkout').isAllowed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 3: Pelanggan A mencoba membaca data Pelanggan B -> Ditolak
  // --------------------------------------------------------------------------
  describe('Skenario 3: Pelanggan A mencoba membaca data Pelanggan B (IDOR Guard)', () => {
    it('Given Pelanggan A memiliki customer_id A, When meminta data transaksi milik Pelanggan B, Then akses DITOLAK (403)', () => {
      const sessionCustomerId = 'cust-uuid-A';
      const requestedCustomerId = 'cust-uuid-B';

      const check = validateCustomerDataAccess(sessionCustomerId, requestedCustomerId);

      expect(check.isAllowed).toBe(false);
      expect(check.statusCode).toBe(403);
      expect(check.error).toContain('Akses ditolak');
    });

    it('Given Pelanggan A memiliki customer_id A, When meminta datanya sendiri, Then diizinkan', () => {
      const sessionCustomerId = 'cust-uuid-A';
      const requestedCustomerId = 'cust-uuid-A';

      const check = validateCustomerDataAccess(sessionCustomerId, requestedCustomerId);

      expect(check.isAllowed).toBe(true);
      expect(check.statusCode).toBe(200);
      expect(check.error).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 4: Staff mencoba mengubah plafon kasbon -> Ditolak
  // --------------------------------------------------------------------------
  describe('Skenario 4: Staff mencoba mengubah plafon kasbon atau tipe pelanggan', () => {
    it('Given pengguna memiliki peran CASHIER (Staff), When mencoba mengubah plafon kasbon atau tipe pelanggan, Then DITOLAK (403)', () => {
      // Staff mencoba ubah max_credit_limit
      const resLimit = validateCustomerCreditLimitUpdatePermission('CASHIER', {
        max_credit_limit: 1500000,
      });
      expect(resLimit.isAllowed).toBe(false);
      expect(resLimit.statusCode).toBe(403);
      expect(resLimit.error).toContain('Hanya Pemilik Toko (Owner)');

      // Staff mencoba ubah customer_type
      const resType = validateCustomerCreditLimitUpdatePermission('CASHIER', {
        customer_type: 'Warung / Grosir',
      });
      expect(resType.isAllowed).toBe(false);
      expect(resType.statusCode).toBe(403);
      expect(resType.error).toContain('Hanya Pemilik Toko (Owner)');
    });

    it('Given pengguna memiliki peran OWNER, When mengubah plafon kasbon atau tipe pelanggan, Then DIIZINKAN', () => {
      const resOwner = validateCustomerCreditLimitUpdatePermission('OWNER', {
        max_credit_limit: 2000000,
        customer_type: 'Warung / Grosir',
      });
      expect(resOwner.isAllowed).toBe(true);
      expect(resOwner.statusCode).toBe(200);
    });

    it('Given Staff hanya mengubah informasi dasar (nama/alamat/telepon) tanpa plafon, Then diizinkan', () => {
      const resBasic = validateCustomerCreditLimitUpdatePermission('CASHIER', {
        name: 'Warung Berkah Updated',
        address: 'Jl. Mawar No. 10',
      });
      expect(resBasic.isAllowed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 5: Nomor WhatsApp sudah terdaftar -> Pendaftaran ditolak
  // --------------------------------------------------------------------------
  describe('Skenario 5: Nomor WhatsApp sudah terdaftar', () => {
    it('Given nomor WhatsApp sudah terdaftar dengan status PENDING atau AKTIF, When ada pendaftaran baru dengan nomor yang sama, Then pendaftaran DITOLAK', async () => {
      // Pendaftaran pertama
      await repo.registerCustomerAccount({
        name: 'Budi Santoso',
        whatsapp_number: '081298765432',
        password: 'password123',
      });

      // Pendaftaran kedua dengan nomor yang sama (berbagai format input 08... vs +62...)
      await expect(
        repo.registerCustomerAccount({
          name: 'Budi Palsu',
          whatsapp_number: '+62 812-9876-5432',
          password: 'password456',
        })
      ).rejects.toThrow(/Nomor WhatsApp sudah terdaftar/i);
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 6: Pelanggan yang ditolak mendaftar ulang
  // --------------------------------------------------------------------------
  describe('Skenario 6: Pelanggan yang ditolak mendaftar ulang', () => {
    it('Given pendaftaran akun berstatus DITOLAK, When pelanggan mendaftar ulang dengan nomor tersebut, Then pendaftaran BERHASIL dan status kembali PENDING', async () => {
      // 1. Daftar awal
      const acc = await repo.registerCustomerAccount({
        name: 'Dewi Sartika',
        whatsapp_number: '081311223344',
        password: 'passwordLama',
      });

      // 2. Kasir menolak pendaftaran dengan alasan
      const rejected = await repo.rejectCustomerAccount({
        account_id: acc.id,
        rejected_by: 'Staff Kasir',
        rejection_reason: 'Foto KTP / identitas belum jelas, mohon daftar ulang.',
      });
      expect(rejected.status).toBe('DITOLAK');
      expect(rejected.rejection_reason).toContain('belum jelas');

      // 3. Pelanggan mendaftar ulang
      const reRegistered = await repo.registerCustomerAccount({
        name: 'Dewi Sartika (Re-registration)',
        whatsapp_number: '081311223344',
        password: 'passwordBaru123',
      });

      // Then: Status kembali PENDING, alasan penolakan dibersihkan
      expect(reRegistered.status).toBe('PENDING');
      expect(reRegistered.rejection_reason).toBeNull();
      expect(reRegistered.name).toBe('Dewi Sartika (Re-registration)');
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 7: Persetujuan: Buat pelanggan baru otomatis Eceran plafon 0
  // --------------------------------------------------------------------------
  describe('Skenario 7: Persetujuan akun dengan Buat Pelanggan Baru', () => {
    it('Given akun PENDING, When kasir menyetujui dengan pilihan Buat Pelanggan Baru, Then pelanggan dibuat bertipe Eceran dengan plafon 0', async () => {
      const reg = await repo.registerCustomerAccount({
        name: 'Joko Widodo',
        whatsapp_number: '081555667788',
        password: 'password123',
      });

      const approval = await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Owner Oline',
        choice: 'CREATE_NEW',
      });

      expect(approval.account.status).toBe('AKTIF');
      expect(approval.account.customer_id).toBeDefined();

      // Verifikasi profil pelanggan yang dibuat
      expect(approval.customer.name).toBe('Joko Widodo');
      expect(approval.customer.customer_type).toBe('Eceran');
      expect(approval.customer.max_credit_limit).toBe(0); // Sesuai PRD: Plafon 0
      expect(approval.customer.current_debt).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 8: Persetujuan: Hubungkan ke pelanggan yang sudah ada
  // --------------------------------------------------------------------------
  describe('Skenario 8: Persetujuan akun dengan Hubungkan ke Pelanggan Lama', () => {
    it('Given akun PENDING dan ada pelanggan lama Warung Bu Siti, When kasir menyetujui dengan Hubungkan, Then akun terhubung ke data Bu Siti', async () => {
      // Ambil pelanggan lama dari seed (Warung Bu Siti)
      const existingCustomer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      expect(existingCustomer.name).toBe('Warung Bu Siti');

      const reg = await repo.registerCustomerAccount({
        name: 'Siti Aminah Akun Baru',
        whatsapp_number: '081999888777',
        password: 'password123',
      });

      const approval = await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Staff Kasir',
        choice: 'LINK_EXISTING',
        existing_customer_id: existingCustomer.id,
      });

      expect(approval.account.status).toBe('AKTIF');
      expect(approval.account.customer_id).toBe(existingCustomer.id);
      expect(approval.customer.id).toBe(existingCustomer.id);
      expect(approval.customer.name).toBe('Warung Bu Siti');
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 9: Anti-Enumerasi Pesan Galat Login
  // --------------------------------------------------------------------------
  describe('Skenario 9: Pesan galat login anti-enumerasi', () => {
    it('Given nomor tidak terdaftar vs kata sandi salah, Then pesan galat seragam dan tidak membocorkan nomor terdaftar', async () => {
      // 1. Akun terdaftar dan AKTIF
      const reg = await repo.registerCustomerAccount({
        name: 'Rudi Tabuti',
        whatsapp_number: '081888999000',
        password: 'passwordBenar123',
      });
      await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Owner Oline',
        choice: 'CREATE_NEW',
      });

      // Kasus A: Nomor terdaftar, tetapi sandi salah
      const resWrongPassword = await authenticateCustomerAccount(
        repo,
        '081888999000',
        'passwordSalahTotal'
      );
      expect(resWrongPassword.success).toBe(false);
      expect(resWrongPassword.status).toBe(401);

      // Kasus B: Nomor sama sekali tidak terdaftar
      const resUnregistered = await authenticateCustomerAccount(
        repo,
        '081999999999',
        'sembarangPassword'
      );
      expect(resUnregistered.success).toBe(false);
      expect(resUnregistered.status).toBe(401);

      // Pastikan pesan galat seragam (Anti-Enumerasi)
      expect(resWrongPassword.error).toBe(resUnregistered.error);
      expect(resWrongPassword.error).toContain('Nomor WhatsApp atau kata sandi tidak valid');
    });
  });
});
