import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
