// نحدد أن المكوّن يستقبل نسبة التقدم كرقم
type ProgressBarProps = {
  progress: number
}

// ننشئ شريط عرض تقدم القراءة
function ProgressBar({ progress }: ProgressBarProps) {
  // نحصر النسبة بين صفر و100 حتى لا يتجاوز الشريط حدوده
  const safeProgress = Math.min(100, Math.max(0, progress))

  // نعرض الشريط الخارجي والجزء الذي يمثّل التقدم
  return (
    // هذا هو المسار الكامل لشريط التقدم
    <div
      style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#ddd',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      {/* عرض الجزء الممتلئ يتغير حسب نسبة القراءة */}
      <div
        style={{
          width: `${safeProgress}%`,
          height: '100%',
          backgroundColor: '#555',
          transition: 'width 0.25s ease',
        }}
      />
    </div>
  )
}

// نصدّر المكوّن كي تستخدمه بطاقة الكتاب
export default ProgressBar