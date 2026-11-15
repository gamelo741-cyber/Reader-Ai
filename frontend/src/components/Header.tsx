
import { strings } from '../strings'

function Header() {
  return (
    <header className="dashboard-header">
      <h1>{strings.dashboard.greeting}</h1>
      <p>{strings.dashboard.greetingDescription}</p>
    </header>
  )
}

export default Header
