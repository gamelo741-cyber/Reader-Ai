import ProgressBar from './ProgressBar'
type BookCardProps = {
  title: string
  author: string
  progress: number
}

function BookCard({ title, author, progress }: BookCardProps) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{author}</p>
      <ProgressBar progress={progress} />
    </article>
  )
}

export default BookCard