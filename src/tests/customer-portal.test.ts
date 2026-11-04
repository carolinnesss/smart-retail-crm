import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataRepository } from '@/lib/repository/mock-repo';
import {
  authenticateCustomerAccount,
  validateCashierEndpointAccess,
  validateCustomerDataAccess,
  validateCustomerCreditLimitUpdatePermission,
} from '@/lib/auth/rbac-guard';
import { ICustomerAccount } from '@/lib/types';

describe('Milestone 7: Akun Pelanggan & Portal Pelanggan (Given / When / Then)', () => {
  let repo: MockDataRepository;

  beforeEach(async () => {
    repo = MockDataRepository.getInstance();
    if (repo.resetMockData) {
      await repo.resetMockData();
    }
  });

  // --------------------------------------------------------------------------
  // Skenario 1: Pelanggan PENDING mencoba login -> DITOLAK
  // --------------------------------------------------------------------------
  describe('Skenario 1: Pelanggan PENDING mencoba login -> ditolak', () => {
    it('Given pelanggan baru mendaftar dengan status PENDING, When mencoba login dengan kredensial benar, Then login ditolak dan sesi tidak dibuat', async () => {
      // Given: Pelanggan mendaftar akun baru
      const phone = '081299990001';
      const password = 'password123';
      const account = await repo.registerCustomerAccount({
        name: 'Ahmad Pendaftar',
        whatsapp_number: phone,
        password: password,
      });

      expect(account.status).toBe('PENDING');

      // When: Pelanggan mencoba login
      const loginResult = await authenticateCustomerAccount(repo, phone, password);

      // Then: Login ditolak dengan status 403, sesi tidak dibuat, dan pesan menginformasikan verifikasi toko
      expect(loginResult.success).toBe(false);
      expect(loginResult.status).toBe(403);
      expect(loginResult.session).toBeUndefined();
      expect(loginResult.error).toContain('menunggu persetujuan kasir');
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 2: Pelanggan memanggil endpoint kasir langsung -> DITOLAK (403)
  // --------------------------------------------------------------------------
  describe('Skenario 2: Pelanggan memanggil endpoint kasir langsung -> ditolak (403)', () => {
    it('Given user terotentikasi sebagai CUSTOMER, When memanggil endpoint kasir (/pos, /api/transactions, /api/analytics), Then ditolak dengan HTTP 403', () => {
      // Given: User dengan peran CUSTOMER
      const role = 'CUSTOMER';

      // When: Mencoba mengakses berbagai endpoint kasir
      const checkTx = validateCashierEndpointAccess(role, '/api/transactions');
      const checkPos = validateCashierEndpointAccess(role, '/api/pos');
      const checkAnalytics = validateCashierEndpointAccess(role, '/api/analytics');
      const checkCustomers = validateCashierEndpointAccess(role, '/api/customers');

      // Then: Semua pemanggilan diblokir dengan 403 Forbidden
      expect(checkTx.isAllowed).toBe(false);
      expect(checkTx.statusCode).toBe(403);
      expect(checkTx.error).toContain('Peran Pelanggan (CUSTOMER) dilarang mengakses fungsi kasir');

      expect(checkPos.isAllowed).toBe(false);
      expect(checkPos.statusCode).toBe(403);

      expect(checkAnalytics.isAllowed).toBe(false);
      expect(checkAnalytics.statusCode).toBe(403);

      expect(checkCustomers.isAllowed).toBe(false);
      expect(checkCustomers.statusCode).toBe(403);
    });

    it('Given user terotentikasi sebagai CASHIER atau OWNER, When memanggil endpoint kasir, Then diizinkan (200 OK)', () => {
      // Given & When
      const checkOwner = validateCashierEndpointAccess('OWNER', '/api/transactions');
      const checkCashier = validateCashierEndpointAccess('CASHIER', '/api/transactions');

      // Then
      expect(checkOwner.isAllowed).toBe(true);
      expect(checkOwner.statusCode).toBe(200);

      expect(checkCashier.isAllowed).toBe(true);
      expect(checkCashier.statusCode).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 3: Pelanggan A mencoba membaca data pelanggan B -> DITOLAK (IDOR Protection)
  // --------------------------------------------------------------------------
  describe('Skenario 3: Pelanggan A mencoba membaca data pelanggan B -> ditolak', () => {
    it('Given Pelanggan A dan Pelanggan B terdaftar, When Pelanggan A meminta data Pelanggan B, Then akses ditolak (403)', () => {
      // Given: Sesi Pelanggan A
      const sessionCustomerIdA = 'customer-uuid-aaa';
      const targetCustomerIdB = 'customer-uuid-bbb';

      // When: Pelanggan A mencoba membaca data Pelanggan B
      const result = validateCustomerDataAccess(sessionCustomerIdA, targetCustomerIdB);

      // Then: Akses ditolak dengan 403 Forbidden
      expect(result.isAllowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain('Akses ditolak: Anda hanya memiliki izin untuk melihat dan mengelola data akun Anda sendiri');
    });

    it('Given Pelanggan A login, When meminta data miliknya sendiri, Then akses diizinkan (200)', () => {
      // Given: Sesi Pelanggan A
      const customerId = 'customer-uuid-aaa';

      // When: Meminta datanya sendiri
      const result = validateCustomerDataAccess(customerId, customerId);

      // Then
      expect(result.isAllowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 4: Staff mencoba mengubah plafon kasbon / tipe pelanggan -> DITOLAK
  // --------------------------------------------------------------------------
  describe('Skenario 4: Staff mencoba mengubah plafon -> ditolak', () => {
    it('Given user memiliki peran CASHIER (Staff), When mencoba mengubah max_credit_limit atau customer_type, Then ditolak dengan HTTP 403', () => {
      // Given: Role CASHIER
      const staffRole = 'CASHIER';

      // When: Mencoba menaikkan limit kredit
      const attemptCreditLimit = validateCustomerCreditLimitUpdatePermission(staffRole, {
        max_credit_limit: 5000000,
      });

      // When: Mencoba mengubah tipe pelanggan
      const attemptCustomerType = validateCustomerCreditLimitUpdatePermission(staffRole, {
        customer_type: 'Warung / Grosir',
      });

      // Then: Ditolak dengan 403 Forbidden khusus Owner
      expect(attemptCreditLimit.isAllowed).toBe(false);
      expect(attemptCreditLimit.statusCode).toBe(403);
      expect(attemptCreditLimit.error).toContain('Hanya Pemilik Toko (Owner) yang berwenang');

      expect(attemptCustomerType.isAllowed).toBe(false);
      expect(attemptCustomerType.statusCode).toBe(403);
      expect(attemptCustomerType.error).toContain('Hanya Pemilik Toko (Owner) yang berwenang');
    });

    it('Given user memiliki peran OWNER, When mengubah plafon kasbon atau tipe pelanggan, Then diizinkan (200)', () => {
      // Given: Role OWNER
      const ownerRole = 'OWNER';

      // When
      const result = validateCustomerCreditLimitUpdatePermission(ownerRole, {
        max_credit_limit: 3000000,
        customer_type: 'Warung / Grosir',
      });

      // Then
      expect(result.isAllowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 5: Nomor WhatsApp sudah terdaftar -> pendaftaran ditolak
  // --------------------------------------------------------------------------
  describe('Skenario 5: nomor WhatsApp sudah terdaftar -> pendaftaran ditolak', () => {
    it('Given nomor WhatsApp sudah terdaftar dengan status PENDING, When mendaftar lagi, Then dilempar error nomor sudah terdaftar', async () => {
      // Given: Nomor WhatsApp sudah terdaftar
      const phone = '081211112222';
      await repo.registerCustomerAccount({
        name: 'Budi Santoso',
        whatsapp_number: phone,
        password: 'password123',
      });

      // When & Then: Pendaftaran kedua dengan nomor yang sama harus ditolak
      await expect(
        repo.registerCustomerAccount({
          name: 'Budi Palsu',
          whatsapp_number: phone,
          password: 'password456',
        })
      ).rejects.toThrow('Nomor WhatsApp sudah terdaftar');
    });

    it('Given nomor WhatsApp sudah berstatus AKTIF, When mendaftar lagi, Then dilempar error nomor sudah terdaftar', async () => {
      // Given: Akun sudah disetujui (AKTIF)
      const phone = '081233334444';
      const reg = await repo.registerCustomerAccount({
        name: 'Siti Rahma',
        whatsapp_number: phone,
        password: 'password123',
      });

      await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Oline',
        choice: 'CREATE_NEW',
      });

      // When & Then: Pendaftaran ulang ditolak
      await expect(
        repo.registerCustomerAccount({
          name: 'Siti Kloning',
          whatsapp_number: phone,
          password: 'password999',
        })
      ).rejects.toThrow('Nomor WhatsApp sudah terdaftar');
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 6: Pelanggan yang ditolak mendaftar ulang
  // --------------------------------------------------------------------------
  describe('Skenario 6: pelanggan yang ditolak mendaftar ulang', () => {
    it('Given pelanggan yang sebelumnya DITOLAK oleh kasir, When mendaftar ulang dengan data baru, Then pendaftaran diterima kembali dengan status PENDING', async () => {
      // Given: Pelanggan mendaftar lalu ditolak oleh kasir
      const phone = '081255556666';
      const reg = await repo.registerCustomerAccount({
        name: 'Doni Penipu Awal',
        whatsapp_number: phone,
        password: 'oldpassword',
      });

      const rejected = await repo.rejectCustomerAccount({
        account_id: reg.id,
        rejected_by: 'Kasir Siti',
        rejection_reason: 'Alamat tempat tinggal di luar area jangkauan toko',
      });

      expect(rejected.status).toBe('DITOLAK');
      expect(rejected.rejection_reason).toContain('di luar area jangkauan toko');

      // When: Pelanggan mendaftar ulang dengan data yang telah diperbaiki
      const reRegistered = await repo.registerCustomerAccount({
        name: 'Doni Pratama (Data Valid)',
        whatsapp_number: phone,
        password: 'newpassword123',
      });

      // Then: Akun diterima kembali menjadi PENDING, nama terupdate, dan alasan penolakan dibersihkan
      expect(reRegistered.status).toBe('PENDING');
      expect(reRegistered.name).toBe('Doni Pratama (Data Valid)');
      expect(reRegistered.rejection_reason).toBeNull();
      expect(reRegistered.rejected_by).toBeNull();

      // Dan di database statusnya sudah kembali PENDING
      const checkDb = await repo.getCustomerAccountByWhatsApp(phone);
      expect(checkDb?.status).toBe('PENDING');
      expect(checkDb?.name).toBe('Doni Pratama (Data Valid)');
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 7: Kasir menyetujui akun pelanggan (Link Existing vs Create New)
  // --------------------------------------------------------------------------
  describe('Skenario 7: Persetujuan akun pelanggan (Create New vs Link Existing)', () => {
    it('Given akun PENDING, When kasir memilih CREATE_NEW, Then otomatis menjadi tipe ECERAN dan plafon kasbon Rp 0', async () => {
      // Given
      const phone = '081277778888';
      const reg = await repo.registerCustomerAccount({
        name: 'Rian Pembeli Baru',
        whatsapp_number: phone,
        password: 'password123',
      });

      // When: Kasir menyetujui dengan opsi buat baru
      const { account, customer } = await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Kasir Siti',
        choice: 'CREATE_NEW',
      });

      // Then: Status aktif, tipe ECERAN, dan plafon 0
      expect(account.status).toBe('AKTIF');
      expect(account.customer_id).toBe(customer.id);
      expect(customer.customer_type).toBe('Eceran');
      expect(customer.max_credit_limit).toBe(0);
      expect(customer.current_debt).toBe(0);
    });

    it('Given akun PENDING, When kasir memilih LINK_EXISTING ke Warung Bu Siti, Then terhubung ke data dan saldo existing', async () => {
      // Given: Pelanggan lama yang sudah ada di toko (Warung Bu Siti)
      const existingCustomers = await repo.getCustomers();
      const existingWarung = existingCustomers.find((c) => c.customer_type === 'Warung / Grosir')!;
      expect(existingWarung).toBeDefined();

      const phone = '081299991111';
      const reg = await repo.registerCustomerAccount({
        name: 'Bu Siti (Akun Web)',
        whatsapp_number: phone,
        password: 'password123',
      });

      // When: Kasir menyetujui dan menghubungkan ke record lama
      const { account, customer } = await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Oline',
        choice: 'LINK_EXISTING',
        existing_customer_id: existingWarung.id,
      });

      // Then: Terhubung ke pelanggan existing dan mewarisi tipe grosir serta saldo/limit lama
      expect(account.status).toBe('AKTIF');
      expect(account.customer_id).toBe(existingWarung.id);
      expect(customer.id).toBe(existingWarung.id);
      expect(customer.customer_type).toBe('Warung / Grosir');
      expect(customer.max_credit_limit).toBe(existingWarung.max_credit_limit);
      expect(customer.savings_balance).toBe(existingWarung.savings_balance);
    });
  });

  // --------------------------------------------------------------------------
  // Skenario 8: Keamanan login & pesan galat tidak membocorkan nomor terdaftar
  // --------------------------------------------------------------------------
  describe('Skenario 8: Pesan galat anti-enumerasi', () => {
    it('Given nomor tidak terdaftar ATAU sandi salah, When mencoba login, Then mengembalikan pesan galat generik yang identik', async () => {
      // Case 1: Nomor sama sekali tidak terdaftar
      const nonExistentPhone = '089999990000';
      const resNonExistent = await authenticateCustomerAccount(repo, nonExistentPhone, 'randompass');

      expect(resNonExistent.success).toBe(false);
      expect(resNonExistent.status).toBe(401);
      expect(resNonExistent.error).toBe('Nomor WhatsApp atau kata sandi tidak valid.');

      // Case 2: Nomor terdaftar AKTIF, tapi kata sandi salah
      const validPhone = '081288889999';
      const reg = await repo.registerCustomerAccount({
        name: 'Pelanggan Asli',
        whatsapp_number: validPhone,
        password: 'correctpassword',
      });
      await repo.approveCustomerAccount({
        account_id: reg.id,
        approved_by: 'Owner',
        choice: 'CREATE_NEW',
      });

      const resWrongPassword = await authenticateCustomerAccount(repo, validPhone, 'wrongpassword');

      // Then: Pesan galat PERSIS SAMA (anti-enumerasi)
      expect(resWrongPassword.success).toBe(false);
      expect(resWrongPassword.status).toBe(401);
      expect(resWrongPassword.error).toBe('Nomor WhatsApp atau kata sandi tidak valid.');
      expect(resWrongPassword.error).toBe(resNonExistent.error);
    });
  });
});
