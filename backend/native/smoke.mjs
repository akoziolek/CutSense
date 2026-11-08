import { createRequire } from 'node:module';
const native = createRequire(import.meta.url)('./pmg_engine.node');

const rect = (w, h) => [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
const res = await native.execute(
  { width: 1450000, length: 2900000 },
  [{ id: 1, points: rect(100000, 200000), seamAllowance: 5000, cuttingAllowance: 20000,
     constraints: [{ rotationAngle: 0, isMirrored: false, requiredQuantity: 2, twoWay: true }] }],
);
console.log(JSON.stringify(res, null, 2));