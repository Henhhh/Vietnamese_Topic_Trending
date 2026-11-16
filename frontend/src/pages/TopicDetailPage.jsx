import { useParams } from 'react-router-dom'

export default function TopicDetailPage() {
  const { topicId } = useParams()
  return <h1>Chi tiết chủ đề {topicId}</h1>
}
