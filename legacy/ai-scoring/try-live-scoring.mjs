import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const env = parseEnv(await readFile(new URL('.dev.vars', root), 'utf8'));
if (!env.OPENROUTER_API_KEY || /your-server-key|วาง|YOUR_KEY/i.test(env.OPENROUTER_API_KEY)) {
  console.log('OpenRouter key is missing or is still a placeholder. No request sent.');
  process.exit(2);
}
const model = env.OPENROUTER_MODEL;
if (!model) throw new Error('OPENROUTER_MODEL is not configured. No request sent.');
if (!model.endsWith(':free')) throw new Error('This test only permits explicitly free models.');
let diagnostics;
const actualFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const response = await actualFetch(...args);
  const body = await response.clone().json().catch(() => ({}));
  diagnostics = {
    status: response.status,
    finishReason: body.choices?.[0]?.finish_reason,
    error: body.error ? {
      code: body.error.code,
      message: String(body.error.message || '').replaceAll(env.OPENROUTER_API_KEY, '[REDACTED]'),
      provider: body.error.metadata?.provider_name,
      raw: String(body.error.metadata?.raw || '').replaceAll(env.OPENROUTER_API_KEY, '[REDACTED]').slice(0, 1200),
    } : undefined,
  };
  return response;
};
const folder = new URL('tmp/live-scoring/', root);
await mkdir(folder, { recursive: true });
for (const name of ['scoring', 'scoring-demo']) {
  const source = await readFile(new URL(`src/worker/${name}.ts`, root), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replaceAll('"./scoring-demo"', '"./scoring-demo.mjs"');
  await writeFile(new URL(`${name}.mjs`, folder), js);
}
const { scorePrompt } = await import(new URL('scoring.mjs', folder));
const samples = [
  { level: 'อ่อน', prompt: 'ช่วยเขียนข้อความเชิญลูกค้ามางานให้หน่อย เอาให้น่าอ่าน' },
  { level: 'กลาง', prompt: '4Seas Nimman กำลังจัดงานขอบคุณแขก ช่วยร่างข้อความเชิญแขกเก่าทาง LINE เป็นภาษาไทย โทนสุภาพและเป็นกันเอง ขอข้อความสั้นอ่านง่าย' },
  { level: 'ดี', prompt: 'บริบท: 4Seas Nimman กำลังวางแผนงานขอบคุณแขก เป็นสถานการณ์สมมติและยังไม่มีวัน เวลา ราคา หรือข้อเสนอที่ยืนยัน เป้าหมาย: ช่วยร่างข้อความเชิญร่วมงานสำหรับส่งทาง LINE ผู้อ่าน: แขกเก่าของโรงแรม ใช้น้ำเสียงอบอุ่น สุภาพ เข้าใจง่าย ข้อกำหนด: ใช้เฉพาะข้อมูลที่ให้ ห้ามแต่งวัน เวลา ราคา หรือโปรโมชัน หากข้อมูลจำเป็นยังขาดให้ถามก่อนเขียนฉบับพร้อมส่ง รูปแบบ: แยกส่วนคำถามที่ต้องยืนยันไม่เกิน 3 ข้อ กับร่างข้อความไม่เกิน 5 บรรทัดภาษาไทย ตามด้วยฉบับภาษาอังกฤษที่มีความหมายตรงกัน โดยใช้ช่องว่าง [รอยืนยัน] สำหรับข้อมูลที่ยังไม่มี' },
];
const report = { date: new Date().toISOString(), model, runs: [] };
console.log(`Testing ${model}; three fictional prompts; no paid fallback.`);
for (const sample of samples) {
  diagnostics = undefined;
  const started = Date.now();
  try {
    const evaluation = await scorePrompt(sample.prompt, { OPENROUTER_API_KEY: env.OPENROUTER_API_KEY }, { mode: 'openrouter', model });
    report.runs.push({ ...sample, seconds: Math.round((Date.now() - started) / 100) / 10, evaluation, diagnostics });
    console.log(JSON.stringify(report.runs.at(-1)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scoring failed';
    report.runs.push({ ...sample, seconds: Math.round((Date.now() - started) / 100) / 10, error: message, diagnostics });
    console.log(JSON.stringify({ level: sample.level, seconds: report.runs.at(-1).seconds, error: message, diagnostics }));
  }
  await writeFile(new URL('results.json', folder), JSON.stringify(report, null, 2));
  await writeFile(new URL(`results-${report.date.replaceAll(':', '-')}.json`, folder), JSON.stringify(report, null, 2));
}
console.log('Results saved to tmp/live-scoring/results.json (no API key).');
