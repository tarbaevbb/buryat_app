import { useNavigate, useParams } from 'react-router-dom'
import { LessonScreen } from '../features/lesson/LessonScreen'

/** Обёртка маршрута /lesson/:lessonId. */
export function LessonRoute() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const onExit = () => navigate('/', { replace: true })

  return <LessonScreen lessonId={lessonId} onExit={onExit} />
}
