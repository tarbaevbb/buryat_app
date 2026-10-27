import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LearnPathScreen } from './screens/LearnPathScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { LessonRoute } from './screens/LessonRoute'
import { BottomNav } from './components/BottomNav'
import { useProgress } from './store/progressStore'
import { startParam, tgUser } from './telegram/init'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const setDisplayName = useProgress((s) => s.setDisplayName)
  const displayName = useProgress((s) => s.displayName)

  // Имя из Telegram — один раз, если пользователь ещё не задал своё.
  useEffect(() => {
    const tg = tgUser()
    if (!displayName && tg?.first_name) setDisplayName(tg.first_name)
  }, [displayName, setDisplayName])

  // Deep link: t.me/<bot>/<app>?startapp=lesson_u1l2
  useEffect(() => {
    const param = startParam()
    const match = param ? /^lesson_(.+)$/.exec(param) : null
    if (match) navigate(`/lesson/${match[1]}`)
  }, [navigate])

  const inLesson = location.pathname.startsWith('/lesson/')

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LearnPathScreen />} />
          <Route path="/lesson/:lessonId" element={<LessonRoute />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!inLesson && <BottomNav />}
    </div>
  )
}
