// @vitest-environment jsdom
// Loading, empty and error states of every page. The API is mocked per test; the real sample
// implementation is used wherever a test needs a normal response.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import RelatedArticles from './components/RelatedArticles'
import TopBar from './components/TopBar'
import OverviewPage from './pages/OverviewPage'
import StatusPage from './pages/StatusPage'
import TopicDetailPage from './pages/TopicDetailPage'

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getTopics: vi.fn(), getTopic: vi.fn(), getTopicArticles: vi.fn(), getStatus: vi.fn() }
})
// Recharts needs real layout; the charts are not what is tested here.
vi.mock('./components/Sparkline', () => ({ default: () => null }))
vi.mock('./components/TrendChart', () => ({ default: () => null }))

const real = await vi.importActual('./api')
const never = () => new Promise(() => {})

beforeEach(() => {
  for (const name of ['getTopics', 'getTopic', 'getTopicArticles', 'getStatus']) api[name].mockImplementation(real[name])
})
afterEach(cleanup)

function renderPage(path, routePath, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}
const clickRetry = () => fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

describe('Overview', () => {
  it('shows a loading message while the first page loads', () => {
    api.getTopics.mockImplementation(never)
    renderPage('/', '/', <OverviewPage />)
    expect(screen.getByText('Đang tải…')).toBeTruthy()
    expect(screen.queryByText('Chủ đề được phát hiện')).toBeNull()
  })

  it('shows an error with a retry button, and retry recovers', async () => {
    api.getTopics.mockRejectedValue(new Error('network'))
    renderPage('/', '/', <OverviewPage />)
    await screen.findByText(/Không tải được dữ liệu/)

    api.getTopics.mockImplementation(real.getTopics)
    clickRetry()
    await screen.findByText('Giá vàng trong nước biến động')
    expect(screen.queryByText(/Không tải được dữ liệu/)).toBeNull()
  })

  it('shows the empty state when nothing matches, and "Xóa bộ lọc" brings the list back', async () => {
    renderPage('/?q=zzzz', '/', <OverviewPage />)
    await screen.findByText(/Không tìm thấy chủ đề phù hợp/)
    expect(screen.getByText(/0 kết quả/)).toBeTruthy()
    expect(screen.queryByText('Xem thêm chủ đề')).toBeNull()

    const buttons = screen.getAllByRole('button', { name: 'Xóa bộ lọc' })
    fireEvent.click(buttons[buttons.length - 1])
    await screen.findByText('Giá vàng trong nước biến động')
    expect(screen.queryByText(/Không tìm thấy chủ đề phù hợp/)).toBeNull()
  })

  it('keeps the loaded rows and shows an error when "Xem thêm chủ đề" fails', async () => {
    renderPage('/', '/', <OverviewPage />)
    await screen.findByText('Giá vàng trong nước biến động')

    api.getTopics.mockRejectedValue(new Error('network'))
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm chủ đề' }))
    await screen.findByText(/Không tải được dữ liệu/)
    expect(screen.getByText('Giá vàng trong nước biến động')).toBeTruthy()
  })

  it('hides "Xem thêm chủ đề" once every topic is loaded', async () => {
    renderPage('/', '/', <OverviewPage />)
    await screen.findByText('Giá vàng trong nước biến động')
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm chủ đề' }))
    await screen.findByText('Điều chỉnh lịch thi tốt nghiệp THPT')
    expect(screen.queryByRole('button', { name: 'Xem thêm chủ đề' })).toBeNull()
  })

  it('ignores an unknown range or sort in the URL and uses the defaults', async () => {
    renderPage('/?range=99h&sort=foo', '/', <OverviewPage />)
    await screen.findByText('Giá vàng trong nước biến động')
    expect(api.getTopics).toHaveBeenCalledWith(expect.objectContaining({ range: '24h', sort: 'score' }))
  })
})

describe('Topic Detail', () => {
  const at = (path = '/topics/1042') => renderPage(path, '/topics/:topicId', <TopicDetailPage />)

  it('shows a loading message', () => {
    api.getTopic.mockImplementation(never)
    at()
    expect(screen.getByText('Đang tải…')).toBeTruthy()
  })

  it('shows "Không tìm thấy chủ đề" with a link back for an unknown id', async () => {
    at('/topics/9999')
    await screen.findByRole('heading', { name: 'Không tìm thấy chủ đề' })
    expect(screen.getByRole('link', { name: /Về trang Tổng quan/ }).getAttribute('href')).toBe('/')
  })

  it('treats a server failure differently from a missing topic, and retry recovers', async () => {
    api.getTopic.mockRejectedValue(new Error('500'))
    at()
    await screen.findByText(/Không tải được dữ liệu/)
    expect(screen.queryByText('Không tìm thấy chủ đề')).toBeNull()

    api.getTopic.mockImplementation(real.getTopic)
    clickRetry()
    await screen.findByRole('heading', { name: 'Giá vàng trong nước biến động' })
  })

  it('falls back to 24h for an unknown range in the URL', async () => {
    at('/topics/1042?range=bogus')
    await screen.findByRole('heading', { name: 'Giá vàng trong nước biến động' })
    expect(api.getTopic).toHaveBeenCalledWith('1042', { range: '24h' })
  })
})

describe('Related articles', () => {
  const sources = [{ code: 'tuoitre', name: 'Tuổi Trẻ' }]
  const show = () => render(<RelatedArticles topicId={1042} sources={sources} total={148} sourceCount={4} />)

  it('shows a loading message', () => {
    api.getTopicArticles.mockImplementation(never)
    show()
    expect(screen.getByText('Đang tải…')).toBeTruthy()
  })

  it('shows an error with retry, and retry recovers', async () => {
    api.getTopicArticles.mockRejectedValue(new Error('network'))
    show()
    await screen.findByText(/Không tải được bài viết/)

    api.getTopicArticles.mockImplementation(real.getTopicArticles)
    clickRetry()
    await screen.findByText('Giá vàng SJC tăng trở lại sau phiên điều chỉnh')
  })

  it('shows the empty state for a source without articles', async () => {
    api.getTopicArticles.mockResolvedValue({ total: 0, limit: 10, offset: 0, items: [] })
    show()
    await screen.findByText('Chưa có bài viết từ nguồn này.')
    expect(screen.queryByRole('button', { name: 'Xem thêm bài viết' })).toBeNull()
  })

  it('offers "Xem thêm bài viết" while fewer articles are loaded than the total, and loads the next page', async () => {
    const make = (n, from) => Array.from({ length: n }, (_, i) => ({ url: `https://example.com/${from + i}`, title: `Bài ${from + i}`, excerpt: 'E', source: { code: 's', name: 'S' }, published_at: '2026-11-16T08:00:00+07:00' }))
    api.getTopicArticles.mockImplementation(async (_id, { offset }) => ({ total: 12, limit: 10, offset, items: offset === 0 ? make(10, 0) : make(2, 10) }))
    show()
    await screen.findByText('Bài 0')
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm bài viết' }))
    await screen.findByText('Bài 11')
    expect(screen.getAllByRole('link', { name: /Đọc bài gốc/ })).toHaveLength(12)
    expect(screen.queryByRole('button', { name: 'Xem thêm bài viết' })).toBeNull()
  })

  it('offers "Xem thêm bài viết" when the first page is smaller than the total (the sample case)', async () => {
    show()
    await screen.findByText('Giá vàng SJC tăng trở lại sau phiên điều chỉnh')
    expect(screen.getByRole('button', { name: 'Xem thêm bài viết' })).toBeTruthy()
  })

  it('stops offering more when a page comes back empty, instead of looping', async () => {
    show()
    await screen.findByText('Giá vàng SJC tăng trở lại sau phiên điều chỉnh')
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm bài viết' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Xem thêm bài viết' })).toBeNull())
    expect(screen.getByText('Giá vàng SJC tăng trở lại sau phiên điều chỉnh')).toBeTruthy()
  })
})

describe('System Status', () => {
  const show = () => render(<StatusPage />)

  it('shows a loading message', () => {
    api.getStatus.mockImplementation(never)
    show()
    expect(screen.getByText('Đang tải…')).toBeTruthy()
  })

  it('shows an error with retry, and retry recovers', async () => {
    api.getStatus.mockRejectedValue(new Error('network'))
    show()
    await screen.findByText(/Không tải được dữ liệu/)

    api.getStatus.mockImplementation(real.getStatus)
    clickRetry()
    await screen.findByRole('heading', { name: /Theo dõi thu thập/ })
  })

  it('shows no banner and "Không có lỗi" when every feed works, and a never-fetched feed as "Chưa thu thập"', async () => {
    const data = structuredClone(await real.getStatus())
    data.warnings = []
    data.summary = { ...data.summary, feeds_ok: 20, feeds_error: 0 }
    data.feeds = data.feeds.map((f, i) => ({ ...f, status: i === 0 ? 'no_data' : 'ok', last_fetched_at: i === 0 ? null : f.last_fetched_at, error_message: null }))
    api.getStatus.mockResolvedValue(data)
    show()
    await screen.findByText('Không có lỗi')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Chưa thu thập')).toBeTruthy()
  })

  it('says "gần nhất" instead of "hiện tại" when no run is in progress', async () => {
    const data = structuredClone(await real.getStatus())
    data.latest_run = { ...data.latest_run, status: 'completed', finished_at: data.latest_run.started_at }
    api.getStatus.mockResolvedValue(data)
    show()
    await screen.findByText(/Lần chạy gần nhất bắt đầu lúc/)
    expect(screen.queryByText(/Lần chạy hiện tại/)).toBeNull()
  })
})

describe('Top bar', () => {
  const show = () => render(<MemoryRouter><TopBar /></MemoryRouter>)

  it('says there is no update yet when the status cannot be loaded', async () => {
    api.getStatus.mockRejectedValue(new Error('network'))
    show()
    await screen.findByText('Chưa có dữ liệu cập nhật')
    expect(screen.queryByText(/Dữ liệu tính đến/)).toBeNull()
  })

  it('shows the data-as-of time and the sample badge', async () => {
    show()
    await screen.findByText('Dữ liệu tính đến')
    expect(screen.getByText('08:15, 16/11/2026')).toBeTruthy()
    expect(screen.getByText('Dữ liệu minh họa')).toBeTruthy()
  })

  it('does not show "Đang cập nhật…" when the latest run is finished', async () => {
    const data = structuredClone(await real.getStatus())
    data.latest_run.status = 'completed'
    api.getStatus.mockResolvedValue(data)
    show()
    await waitFor(() => screen.getByText(/Dữ liệu tính đến/))
    expect(screen.queryByText('Đang cập nhật…')).toBeNull()
  })
})

describe('Original-article links', () => {
  // Every "Đọc bài gốc" link must open the real article URL in a new tab, safely.
  const expectSafeLinks = (links, urls) => {
    expect(links.map((a) => a.getAttribute('href'))).toEqual(urls)
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    }
  }

  it('points each link at the article URL and opens it in a new tab', async () => {
    const detail = await real.getTopic(1042)
    renderPage('/topics/1042', '/topics/:topicId', <TopicDetailPage />)
    await screen.findByText('Giá vàng SJC tăng trở lại sau phiên điều chỉnh')

    const links = screen.getAllByRole('link', { name: /Đọc bài gốc/ })
    const { items } = await real.getTopicArticles(1042)
    expectSafeLinks(links, [detail.representative_article.url, ...items.map((a) => a.url)])
    expect(links.every((a) => /^https:\/\//.test(a.getAttribute('href')))).toBe(true)
  })

  it('uses the same attributes for any article, whatever its URL', () => {
    const article = { url: 'https://example.com/bai?x=1', title: 'T', excerpt: 'E', source: { code: 's', name: 'S' }, published_at: '2026-11-16T08:00:00+07:00' }
    api.getTopicArticles.mockResolvedValue({ total: 1, limit: 10, offset: 0, items: [article] })
    render(<RelatedArticles topicId={1} sources={[]} total={1} sourceCount={1} />)
    return screen.findByRole('link', { name: /Đọc bài gốc/ }).then((a) => expectSafeLinks([a], [article.url]))
  })
})
