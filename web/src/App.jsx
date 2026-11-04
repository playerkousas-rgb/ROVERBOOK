import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useRoute, navigate, Link } from './router.jsx';
import { Avatar, Crest, Icon, cx } from './ui.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import RecordBook from './pages/RecordBook.jsx';
import Privacy from './pages/Privacy.jsx';
import Connections from './pages/Connections.jsx';
import Crew from './pages/Crew.jsx';
import MemberView from './pages/MemberView.jsx';
import PublicCard from './pages/PublicCard.jsx';

const SessionCtx = createContext({ user: null, refresh: async () => {} });
export const useSession = () => useContext(SessionCtx);

const NAV = [
  { to: '/', label: '我的卡片', icon: 'card', exact: true },
  { to: '/record', label: '紀錄冊', icon: 'medal' },
  { to: '/privacy', label: '私隱', icon: 'shield' },
  { to: '/connections', label: '連結', icon: 'users' },
  { to: '/crew', label: '團隊', icon: 'compass', leaderOnly: true },
];

function Splash() {
  return (
    <div className="splash">
      <Crest size={54} />
      <span>ROVERBOOK</span>
    </div>
  );
}

function Shell({ user, path, children, onLogout }) {
  const items = NAV.filter((n) => !n.leaderOnly || user.role === 'leader');
  const isActive = (to, exact) => (exact ? path === to : path === to || path.startsWith(`${to}/`));
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <Crest size={34} />
          <span className="brand__text">
            <strong>ROVERBOOK</strong>
            <em>樂行童軍紀錄卡</em>
          </span>
        </Link>

        <nav className="nav" aria-label="主導航">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className={cx('nav__item', isActive(item.to, item.exact) && 'is-active')}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__user">
            <Avatar name={user.nameZh} photo={user.photo} size={36} />
            <div>
              <strong>{user.nameZh}</strong>
              <span>{user.role === 'leader' ? user.leaderTitle || '領袖' : user.memberNo}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onLogout} title="登出" aria-label="登出">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <div className="mobilebar">
        <Link to="/" className="mobilebar__brand">
          <Crest size={26} />
          <strong>ROVERBOOK</strong>
        </Link>
        <Avatar name={user.nameZh} photo={user.photo} size={30} />
      </div>

      <main className="main">{children}</main>

      <nav className="tabbar" aria-label="底部導航">
        {items.slice(0, 5).map((item) => (
          <Link key={item.to} to={item.to} className={cx('tabbar__item', isActive(item.to, item.exact) && 'is-active')}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const path = useRoute();
  const [state, setState] = useState({ loading: true, user: null });

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/session');
      setState({ loading: false, user: res.user });
      return res.user;
    } catch {
      setState({ loading: false, user: null });
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await api.post('/logout', {});
    setState({ loading: false, user: null });
    navigate('/login', { replace: true });
  };

  if (path.startsWith('/c/')) return <PublicCard slug={path.slice(3)} />;
  if (state.loading) return <Splash />;
  if (!state.user) return <Login onDone={refresh} />;

  let page = <Home />;
  if (path === '/record') page = <RecordBook />;
  else if (path === '/privacy') page = <Privacy />;
  else if (path === '/connections') page = <Connections />;
  else if (path === '/crew') page = <Crew />;
  else if (path.startsWith('/m/')) page = <MemberView id={path.slice(3)} />;

  return (
    <SessionCtx.Provider value={{ user: state.user, refresh }}>
      <Shell user={state.user} path={path} onLogout={logout}>
        {page}
      </Shell>
    </SessionCtx.Provider>
  );
}
