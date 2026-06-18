/* assets/access.js — ดึงสิทธิเข้าเรียนของผู้ใช้จาก /api/me แล้ว gate คอร์สบนหน้า
   ใช้คู่กับ LIFF (ต้อง liff.init เสร็จก่อนเรียก DBAccess.load) */
(function (w) {
  var ACCESS = { loaded: false, courses: [], profile: null };
  w.DBAccess = ACCESS;

  ACCESS.has = function (code) { return ACCESS.courses.indexOf(code) > -1; };

  ACCESS.load = async function () {
    try {
      if (typeof liff === 'undefined' || !liff.isLoggedIn || !liff.isLoggedIn()) {
        // ยังไม่ล็อกอิน — ลองใช้ค่าที่เคย cache ไว้
        try { ACCESS.courses = JSON.parse(localStorage.getItem('db_courses') || '[]'); } catch (e) {}
        return ACCESS;
      }
      var idToken = liff.getIDToken();
      var r = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken })
      });
      if (r.ok) {
        var data = await r.json();
        ACCESS.courses = data.courses || [];
        ACCESS.profile = data.profile || null;
        ACCESS.loaded = true;
        try { localStorage.setItem('db_courses', JSON.stringify(ACCESS.courses)); } catch (e) {}
      }
    } catch (e) {
      console.error('DBAccess.load', e);
      try { ACCESS.courses = JSON.parse(localStorage.getItem('db_courses') || '[]'); } catch (e2) {}
    }
    return ACCESS;
  };

  /* gate: element ที่มี data-course — ถ้าไม่มีสิทธิจะใส่ class .locked */
  ACCESS.gate = function (root) {
    (root || document).querySelectorAll('[data-course]').forEach(function (el) {
      var code = el.getAttribute('data-course');
      if (ACCESS.has(code)) {
        el.classList.remove('locked');
        el.removeAttribute('aria-disabled');
      } else {
        el.classList.add('locked');
        el.setAttribute('aria-disabled', 'true');
      }
    });
  };
})(window);
