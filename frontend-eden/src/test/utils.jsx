import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// QueryClient ใหม่ต่อการเรียกหนึ่งครั้ง — retry ปิดเพื่อให้ error โผล่ทันที
// (อย่า import src/lib/queryClient.js — เป็น singleton + ผูก window listener)
export function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function createWrapper(client = makeClient()) {
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui,
  { route = "/", client = makeClient() } = {}
) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    ),
  };
}
