import { IDataRepository } from './interface';
import { MockDataRepository } from './mock-repo';
import { SupabaseDataRepository } from './supabase-repo';
import { isSupabaseConfigured } from '../supabase';

export * from './interface';
export * from './mock-repo';
export * from './supabase-repo';

/**
 * Universal repository factory:
 * If Supabase environment variables are provided and valid, returns SupabaseDataRepository.
 * Otherwise, falls back to the in-memory/local MockDataRepository singleton.
 */
export function getRepository(): IDataRepository {
  if (isSupabaseConfigured()) {
    try {
      return new SupabaseDataRepository();
    } catch (err) {
      console.warn(
        'SupabaseDataRepository initialization failed, falling back to MockDataRepository:',
        err
      );
      return MockDataRepository.getInstance();
    }
  }

  return MockDataRepository.getInstance();
}
