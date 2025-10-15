import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-test');
