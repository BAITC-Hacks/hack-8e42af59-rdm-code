// Асинхронная граница для будущего API. UI-состояние остаётся локальным в MVP.
export const demoApi = {
  async health() { return { ok:true, mode:'local-demo' as const } },
  async validatePrototypeUrl(url:string) { try { const parsed=new URL(url); return ['http:','https:'].includes(parsed.protocol) } catch { return false } },
}
