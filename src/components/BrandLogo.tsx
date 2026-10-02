// โลโก้ NabKuad + เครดิตผู้สร้าง — ใช้ร่วมทุกหน้า (server-safe, ไม่มี hook)
// ต้องอยู่ในหน้าที่มี .brand / .fp / .p / .mono (สไตล์ของ .brand-credit อยู่ใน globals.css)
export default function BrandLogo() {
  return (
    <div className="brand-block">
      <div className="brand">
        <span className="fp">Nab</span>
        <span className="p">Kuad</span>
      </div>
      <div className="brand-credit mono">by Pong Theerachai</div>
    </div>
  );
}
