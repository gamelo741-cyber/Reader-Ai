type SidebarProps = {
  // نحدد الدالة التي تستقبل الصفحة المطلوبة
  onNavigate: (page: 'Dashboard' | 'Library') => void
  // نحدد اسم الصفحة المفتوحة حاليًا
  currentPage: 'Dashboard' | 'Library'
}

// نستقبل معلومات التنقل من المكوّن الأب
function Sidebar({ onNavigate, currentPage }: SidebarProps) {
  return (
    // الحاوية الرئيسية للقائمة
    <aside className="sidebar">
      {/* اسم التطبيق */}
      <h2 className="logo">Reader AI</h2>

      {/* روابط التنقل بين الصفحات */}
      <nav className="sidebar-nav">
        {/* عند الضغط نفتح Dashboard */}
        <button
          className={currentPage === 'Dashboard' ? 'active' : ''}
          onClick={() => onNavigate('Dashboard')}
        >
          Dashboard
        </button>

        {/* عند الضغط نفتح Library */}
        <button
          className={currentPage === 'Library' ? 'active' : ''}
          onClick={() => onNavigate('Library')}
        >
          Library
        </button>
      </nav>
    </aside>
  )
}

// نصدّر القائمة حتى تستخدمها الصفحات
export default Sidebar
