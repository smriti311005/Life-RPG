import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';

import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/AppShell';
import { Celebration } from './components/Celebration';
import { AchievementToast } from './components/AchievementToast';
import { LoadingVeil, EmptyState } from './components/Primitives';
import { ErrorBoundary } from './components/ErrorBoundary';

import Landing from './pages/Landing';
import Enter from './pages/Enter';
import Quests from './pages/Quests';

// The pages behind the fold are split out: the first paint after sign-in only
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chronicle = lazy(() => import('./pages/Chronicle'));
const Emporium = lazy(() => import('./pages/Emporium'));
const Keep = lazy(() => import('./pages/Keep'));
const Character = lazy(() => import('./pages/Character'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

/* -------------------------------------------------------------------------- */
/* Route guards                                                               */
/* -------------------------------------------------------------------------- */

function Protected({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <LoadingVeil label="Unlocking the gate" />;
  // Remember where they were headed so sign-in returns them there.
  if (!user) return <Navigate to="/enter" state={{ from: location.pathname }} replace />;

  return children;
}

/**
 * A signed-in account with no class has not finished character creation.
 * Everything behind the shell assumes a class exists, so send them back to it.
 */
function RequiresCharacter({ children }) {
  const { character, status } = useGame();

  if (status === 'loading' || status === 'idle') {
    return <LoadingVeil label="Reading your character sheet" />;
  }
  if (character && !character.characterClass) return <Navigate to="/create" replace />;

  return children;
}

function PublicOnly({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <LoadingVeil label="Checking your session" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/* -------------------------------------------------------------------------- */
/* Shell for the signed-in half of the app                                    */
/* -------------------------------------------------------------------------- */

function GameArea({ children }) {
  const { celebration, clearCelebration, character } = useGame();

  return (
    <MotionConfig reducedMotion={character?.settings?.reducedMotion ? 'always' : 'user'}>
      <RequiresCharacter>
        <AppShell>
          <ErrorBoundary>
            <Suspense fallback={<LoadingVeil label="Loading" />}>{children}</Suspense>
          </ErrorBoundary>
          <Celebration event={celebration} onClose={clearCelebration} />
          <AchievementToast />
        </AppShell>
      </RequiresCharacter>
    </MotionConfig>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-[100dvh] place-items-center px-4">
      <EmptyState
        glyph="◌"
        title="There is nothing at this address"
        action={
          <Link to="/" className="btn-primary">
            Back to the front page
          </Link>
        }
      >
        The page you asked for does not exist — or it moved while you were away.
      </EmptyState>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  return (
    <ErrorBoundary>
      {/* Honour the OS reduced-motion setting across every route, including the
          auth screen and toasts, which sit outside the signed-in shell. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <GameProvider>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <PublicOnly>
                        <Landing />
                      </PublicOnly>
                    }
                  />
                  <Route path="/enter" element={<Enter />} />

                  <Route
                    path="/create"
                    element={
                      <Protected>
                        <ErrorBoundary>
                          <Suspense fallback={<LoadingVeil label="Preparing the ritual" />}>
                            <Onboarding />
                          </Suspense>
                        </ErrorBoundary>
                      </Protected>
                    }
                  />

                  <Route
                    path="/dashboard"
                    element={
                      <Protected>
                        {/* Same guards as the rest of the signed-in app, minus
                            AppShell: the dashboard brings its own chrome. */}
                        <MotionConfig reducedMotion="user">
                          <RequiresCharacter>
                            <ErrorBoundary>
                              <Suspense fallback={<LoadingVeil label="Opening the Great Hall" />}>
                                <Dashboard />
                              </Suspense>
                            </ErrorBoundary>
                          </RequiresCharacter>
                        </MotionConfig>
                      </Protected>
                    }
                  />

                  <Route
                    path="/play"
                    element={
                      <Protected>
                        <GameArea>
                          <Quests />
                        </GameArea>
                      </Protected>
                    }
                  />
                  <Route
                    path="/character"
                    element={
                      <Protected>
                        <GameArea>
                          <Character />
                        </GameArea>
                      </Protected>
                    }
                  />
                  <Route
                    path="/achievements"
                    element={
                      <Protected>
                        <GameArea>
                          <Achievements />
                        </GameArea>
                      </Protected>
                    }
                  />
                  <Route
                    path="/chronicle"
                    element={
                      <Protected>
                        <GameArea>
                          <Chronicle />
                        </GameArea>
                      </Protected>
                    }
                  />
                  <Route
                    path="/emporium"
                    element={
                      <Protected>
                        <GameArea>
                          <Emporium />
                        </GameArea>
                      </Protected>
                    }
                  />
                  <Route
                    path="/keep"
                    element={
                      <Protected>
                        <GameArea>
                          <Keep />
                        </GameArea>
                      </Protected>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </GameProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  );
}
