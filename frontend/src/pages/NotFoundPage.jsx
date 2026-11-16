import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import PageIntro from '../components/PageIntro'

export default function NotFoundPage() {
  return (
    <>
      <PageIntro title="Không tìm thấy trang" subtitle="Đường dẫn này không tồn tại." />
      <Link className="back-button" to="/">
        <Icon name="back" size={17} /> Về Tổng quan
      </Link>
    </>
  )
}
