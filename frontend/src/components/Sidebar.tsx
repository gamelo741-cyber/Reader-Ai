import { API_URL } from '../config'
import { strings } from '../strings'

type SidebarProps = {
  onNavigate: (page: 'Dashboard' | 'Library') => void
  currentPage: 'Dashboard' | 'Library'
}

function Sidebar({ onNavigate, currentPage }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h2 className="logo">{strings.navigation.appName}</h2>
      <nav className="sidebar-nav">
        <button
          className={currentPage === 'Dashboard' ? 'active' : ''}
          onClick={() => onNavigate('Dashboard')}
        >
          {strings.navigation.dashboard}
        </button>
        <button
          className={currentPage === 'Library' ? 'active' : ''}
          onClick={() => onNavigate('Library')}
        >
          {strings.navigation.library}
        </button>
      </nav>

      <small className="build-stamp">
        {strings.navigation.buildStamp
          .replace('{buildTime}', __BUILD_TIME__)
          .replace('{apiUrl}', API_URL)}
      </small>
    </aside>
  )
}

export default Sidebar
