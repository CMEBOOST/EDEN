// query key factory กลาง — ให้ key ตรงกันทุกที่ (สำคัญตอน invalidate)
// invalidate ด้วย prefix เช่น ["contracts"] จะ match ทุก key ที่ขึ้นต้นด้วย "contracts"
export const qk = {
  tenants: ["tenants"],
  tenant: (id) => ["tenants", String(id)],
  users: ["users"],
  user: (id) => ["users", String(id)],
  contracts: (params) => ["contracts", params ?? {}],
  contract: (id) => ["contracts", String(id)],
  checklists: (contractId) => ["contracts", String(contractId), "checklists"],
  documents: (tenantId) => ["tenants", String(tenantId), "documents"],
  rates: ["rates"],
  currentRates: (date) => ["rates", "current", date ?? null],
  rooms: (params) => ["rooms", params ?? {}],
  requests: (status) => ["contract-requests", status ?? "all"],
  dashboard: ["dashboard"],
  profile: ["profile"],
  auditLogs: (filters) => ["audit-logs", filters ?? {}],
};
