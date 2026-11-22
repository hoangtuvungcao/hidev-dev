import React from 'react';

export default function DbErrorNotice({ errorMessage }: { errorMessage: string }) {
  return (
    <div className="db-alert">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', marginBottom: '8px' }}>
        ⚠️ Lỗi Kết Nối Cơ Sở Dữ Liệu MySQL/MariaDB
      </h3>
      <p style={{ margin: '8px 0', fontSize: '14px', color: '#fca5a5' }}>
        Ứng dụng không thể kết nối đến cơ sở dữ liệu MySQL của bạn. Tuy nhiên, hệ thống đã tự động tải cấu hình mặc định (fallback) để bạn có thể xem trước giao diện và thao tác.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px', color: 'var(--text)' }}>
        <strong>Để kết nối dữ liệu động, vui lòng thực hiện các bước sau:</strong>
        <ol style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>
            Khởi động MySQL trong <strong>XAMPP</strong> (chạy lệnh: <code>sudo /opt/lampp/lampp startmysql</code> hoặc mở XAMPP Control Panel).
          </li>
          <li>
            Tạo cơ sở dữ liệu tên là <code>hidev_db</code> (truy cập <code>http://localhost/phpmyadmin</code> hoặc dùng CLI client).
          </li>
          <li>
            Import dữ liệu mẫu bằng cách chạy script trong file <code>schema.sql</code> nằm tại thư mục gốc của dự án.
          </li>
          <li>
            Kiểm tra thông tin đăng nhập database trong file <code>.env</code>.
          </li>
        </ol>
      </div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#f87171' }}>
        Chi tiết lỗi hệ thống: <code>{errorMessage}</code>
      </div>
    </div>
  );
}
