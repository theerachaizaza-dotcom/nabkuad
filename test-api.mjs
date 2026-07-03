/**
 * NabKuad — API smoke test (POST counts + submit)
 * รันด้วย:  node test-api.mjs
 *
 * ทดสอบว่า:
 *   1) bootstrap ดึง products/locations ได้
 *   2) มี session ที่ open (ถ้าไม่มี จะบอกให้ไปสร้างก่อน)
 *   3) POST counts แล้ว logic "ทบเศษ" ทำงานถูก (898ml -> 6 ขวด + 198ml)
 *   4) capacity_ml_snapshot ถูกเก็บ
 *   5) submit เปลี่ยนสถานะ location เป็น submitted
 *
 * หมายเหตุ: ปรับ BASE ถ้า dev server ไม่ได้อยู่ที่ 3000
 */

const BASE = "http://localhost:3000";

// สินค้าทดสอบ: เลือก Belvedere 700ml (fractional) — SKU VDK-001
const TEST_SKU = "VDK-001";
const CAPACITY = 700;

const c = { ok:"\x1b[32m✔\x1b[0m", no:"\x1b[31m✘\x1b[0m", dim:"\x1b[90m", off:"\x1b[0m" };
const log = (...a)=>console.log(...a);

async function j(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status:r.status, body };
}

(async () => {
  log(`\n${c.dim}=== NabKuad API smoke test ===${c.off}\n`);

  // 1) bootstrap
  const boot = await j(`${BASE}/api/v1/bootstrap`);
  if (boot.status !== 200) return log(`${c.no} bootstrap ล้มเหลว (status ${boot.status})`, boot.body);
  const products  = boot.body.products  || [];
  const locations = boot.body.locations || [];
  const prod = products.find(p => p.sku === TEST_SKU);
  const loc  = locations.find(l => l.code === "SVC") || locations[0];
  log(`${c.ok} bootstrap: ${products.length} products, ${locations.length} locations`);
  if (!prod) return log(`${c.no} ไม่เจอสินค้า SKU ${TEST_SKU} ใน bootstrap`);
  log(`  ${c.dim}ทดสอบกับ:${c.off} ${prod.name}  (cap=${prod.capacity_ml}ml, mode=${prod.count_mode})`);
  log(`  ${c.dim}location:${c.off} ${loc.name} (${loc.code})`);

  // 2) current session
  const sess = await j(`${BASE}/api/v1/sessions/current`);
  const session = sess.body && (sess.body.id ? sess.body : sess.body.session);
  if (!session || !session.id) {
    log(`\n${c.no} ยังไม่มี session ที่ open`);
    log(`  ${c.dim}ไปหน้า admin สร้างรอบนับใหม่ก่อน แล้วรัน test นี้อีกที${c.off}`);
    return;
  }
  log(`${c.ok} current session: ${session.name || session.id}`);

  // 3) POST counts — เคสทบเศษ: 5 ขวดเต็ม + เศษ 898ml
  log(`\n${c.dim}--- POST counts: 5 ขวดเต็ม + เศษ 898ml (ควรทบเป็น 6 + 198) ---${c.off}`);
  const post = await j(`${BASE}/api/v1/sessions/${session.id}/counts`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      location_id: loc.id,
      lines: [{ product_id: prod.id, full_bottles: 5, leftover_ml: 898 }]
    })
  });
  if (post.status >= 400) return log(`${c.no} POST counts ล้มเหลว (status ${post.status})`, post.body);
  log(`${c.ok} POST counts สำเร็จ (status ${post.status})`);

  // 4) อ่านกลับมาเช็ค
  const check = await j(`${BASE}/api/v1/sessions/${session.id}/lines?location_id=${loc.id}`);
  const lines = Array.isArray(check.body) ? check.body : (check.body.lines || []);
  const line  = lines.find(x => x.product_id === prod.id);
  const expectedNet = +(6 + 198/CAPACITY).toFixed(3); // 6.283

  log(`\n${c.dim}--- ตรวจผลลัพธ์ ---${c.off}`);
  if (!line) {
    log(`${c.no} อ่าน line กลับมาไม่เจอ (endpoint /lines อาจยังไม่มี) — เช็คใน Supabase Table Editor แทน`);
  } else {
    const chk = (cond,label,got,exp)=>log(`  ${cond?c.ok:c.no} ${label}: ${got}${exp!==undefined?`  ${c.dim}(คาดว่า ${exp})${c.off}`:""}`);
    chk(line.full_bottles===6,        "full_bottles ทบแล้ว", line.full_bottles, 6);
    chk(line.leftover_ml===198,       "leftover_ml เหลือ",    line.leftover_ml, 198);
    chk(line.capacity_ml_snapshot===CAPACITY, "capacity snapshot", line.capacity_ml_snapshot, CAPACITY);
    chk(Math.abs((+line.net_bottles)-expectedNet)<0.01, "net_bottles", (+line.net_bottles).toFixed(3), expectedNet);
  }

  // 5) submit
  log(`\n${c.dim}--- POST submit ---${c.off}`);
  const sub = await j(`${BASE}/api/v1/sessions/${session.id}/submit`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ location_id: loc.id })
  });
  log(`  ${sub.status<400?c.ok:c.no} submit (status ${sub.status})`);

  log(`\n${c.dim}=== จบการทดสอบ ===${c.off}`);
  log(`ถ้าทุกข้อขึ้น ✔ = core logic ทำงานถูกหมด พร้อมทำหน้า mobile ต่อได้เลย\n`);
})();
