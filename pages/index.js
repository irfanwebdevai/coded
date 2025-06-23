import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setIsAuthenticated(data.isAuthenticated);
      })
      .catch(err => console.log('Auth check failed:', err));
  }, []);

  return (
    <>
      <Head>
        <title>Codedx - Master the Art of Code</title>
        <meta name="description" content="Start your Adventure in the world of programming. Master coding skills, build epic projects, and join a legendary community of developers." />
      </Head>

      {/* Header */}
      <header className="header">
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-brand">
              <span className="brand-icon">🛡️</span>
              <span>Codedx</span>
            </div>
            
            <ul className="nav-menu">
              <li className="nav-item">
                <Link href="/courses" className="nav-link">Courses</Link>
              </li>
            </ul>
            
            <div className="nav-actions">
              {isAuthenticated ? (
                <>
                  <div className="user-menu">
                    <span className="user-avatar">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="avatar-img" />
                      ) : (
                        <i className="fas fa-user-circle"></i>
                      )}
                    </span>
                    <span className="user-name">{user?.name}</span>
                  </div>
                  <Link href="/dashboard" className="btn-secondary">
                    <span>🎮</span>
                    <span>Dashboard</span>
                  </Link>
                  <Link href="/api/auth/logout" className="btn-secondary">
                    <span>🚪</span>
                    <span>Logout</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-settings">
                    <i className="fas fa-sign-in-alt"></i>
                    <span>Login</span>
                  </Link>
                  <Link href="/auth/signup" className="btn-signup">
                    <span className="quest-icon">🗺️</span>
                    <span>Sign up</span>
                  </Link>
                </>
              )}
            </div>
            
            <div className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content" style={{textAlign: 'left', maxWidth: '600px'}}>
            <h1 className="hero-title" style={{textAlign: 'left'}}>Master the Art of Code</h1>
            <p className="hero-subtitle" style={{textAlign: 'left'}}>
              Start your Adventure in the world of programming. Master coding skills,
              build epic projects, and join a legendary community of developers.
            </p>
            <div className="hero-actions" style={{justifyContent: 'flex-start'}}>
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary btn-large">
                  <span className="quest-icon">🎮</span>
                  <span>Continue Adventure</span>
                </Link>
              ) : (
                <Link href="/auth/signup" className="btn-primary btn-large">
                  <span className="quest-icon">⚔️</span>
                  <span>Join the Guild</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="courses" style={{padding: '80px 0', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'}}>
        <div className="container">
          <div className="section-header" style={{textAlign: 'center', marginBottom: '60px'}}>
            <h2 style={{color: '#fff', fontSize: '2.5rem', marginBottom: '16px'}}>
              Learn to code with fun, interactive courses handcrafted by industry experts and educators.
            </h2>
            
            {/* Course Categories */}
            <div className="course-categories" style={{display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px'}}>
              <button className="category-btn active" style={{padding: '12px 24px', borderRadius: '25px', border: '2px solid #4a9eff', background: '#4a9eff', color: 'white', fontWeight: '600', cursor: 'pointer'}}>Popular</button>
              <button className="category-btn" style={{padding: '12px 24px', borderRadius: '25px', border: '2px solid #555', background: 'transparent', color: '#ccc', fontWeight: '600', cursor: 'pointer'}}>Web Development</button>
              <button className="category-btn" style={{padding: '12px 24px', borderRadius: '25px', border: '2px solid #555', background: 'transparent', color: '#ccc', fontWeight: '600', cursor: 'pointer'}}>Data Science</button>
              <button className="category-btn" style={{padding: '12px 24px', borderRadius: '25px', border: '2px solid #555', background: 'transparent', color: '#ccc', fontWeight: '600', cursor: 'pointer'}}>Tools</button>
            </div>
          </div>
          
          {/* Course Grid */}
          <div className="courses-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto'}}>
            
            {/* Python Course */}
            <Link href="/courses/python" style={{textDecoration: 'none', color: 'inherit'}}>
              <div className="course-card" style={{background: '#2a2a3e', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'pointer'}}>
                <div className="course-image" style={{height: '200px', background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)', position: 'relative', overflow: 'hidden'}}>
                  {/* Python Jungle Theme Decorations */}
                  <div style={{position: 'absolute', top: '30px', right: '30px', width: '40px', height: '40px', background: '#065f46', borderRadius: '50%', opacity: '0.3'}}></div>
                  <div style={{position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '60px', background: '#fbbf24', borderRadius: '50%', opacity: '0.8'}}></div>
                  <div style={{position: 'absolute', bottom: '20px', left: '20px', right: '20px', height: '8px', background: '#065f46', borderRadius: '4px', opacity: '0.4'}}></div>
                  
                  {/* Python Logo */}
                  <div style={{position: 'absolute', top: '20px', left: '20px', width: '60px', height: '60px', background: '#3776ab', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'}}>
                    <span style={{color: 'white', fontSize: '24px', fontWeight: 'bold'}}>🐍</span>
                  </div>
                </div>
                
                <div className="course-content" style={{padding: '24px'}}>
                  <div className="course-meta" style={{marginBottom: '12px'}}>
                    <span style={{color: '#888', fontSize: '14px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '1px'}}>COURSE</span>
                  </div>
                  
                  <h3 style={{color: '#fff', fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px'}}>Python</h3>
                  
                  <p style={{color: '#ccc', lineHeight: '1.6', marginBottom: '20px'}}>
                    Learn programming fundamentals such as variables, control flow, and loops with the world's most popular programming language.
                  </p>
                  
                  <div className="course-level" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%'}}></div>
                    <span style={{color: '#22c55e', fontSize: '14px', fontWeight: '600'}}>BEGINNER</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Why Join Our Guild?</h2>
            <p>Embark on the ultimate coding adventure</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-sword"></i>
              </div>
              <h3>Epic Quests</h3>
              <p>Master coding skills through challenging quests and hands-on battles with real code.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Guild Support</h3>
              <p>Join forces with fellow adventurers and legendary developers in your coding journey.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <h3>Level Up</h3>
              <p>Track your progress, earn achievements, and climb the leaderboard as you master new skills.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Game Section */}
      <section className="game-section" style={{padding: '80px 0', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)', position: 'relative', overflow: 'hidden'}}>
        <div className="container">
          <div className="game-content">
            <h2 className="game-title">Ready for the Challenge?</h2>
            <p className="game-subtitle">Test your skills in our interactive coding playground</p>
            <div className="game-actions">
              <Link href="/auth/signup" className="btn-primary btn-large">
                <span>🎮</span>
                <span>Start Playing</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="brand-icon">🛡️</span>
              <span>Codedx</span>
            </div>
            <p>&copy; 2024 Codedx. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
} 