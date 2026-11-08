import { createRequire } from 'node:module';

const native = createRequire(import.meta.url)(process.env.PMG_ENGINE_PATH);

// the parent kills this process after it gets the answer; exit if the parent disappears
process.on('disconnect', () => process.exit(0));

process.once('message', async ({ fabric, pieces }) => {
  try {
    process.send({ ok: true, result: await native.execute(fabric, pieces) });
  } catch (e) {
    process.send({ ok: false, error: String(e?.message ?? e) });
  }
});