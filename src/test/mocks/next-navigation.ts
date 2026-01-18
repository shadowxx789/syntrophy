import { vi } from "vitest";

export function useRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function usePathname() {
  return "/";
}
