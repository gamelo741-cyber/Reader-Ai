
function Header() {
  return (
    // الحاوية الرئيسية لعنوان الصفحة
    <header className="dashboard-header">
      {/* العنوان الرئيسي */}
      <h1>Good to see you again.</h1>

      {/* وصف مختصر لما تعرضه الصفحة */}
      <p>Keep your reading journey going.</p>
    </header>
  )
}

// نصدّر المكوّن حتى نستخدمه في Dashboard
export default Header
