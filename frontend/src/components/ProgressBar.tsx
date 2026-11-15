type ProgressBarProps = {
  progress: number
}

function ProgressBar({ progress }: ProgressBarProps) {
  const safeProgress = Math.min(100, Math.max(0, progress))

  return (
    <div
      style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#ddd',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
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

export default ProgressBar