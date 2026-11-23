# Quy tắc Codex — Thành viên 2: Thu thập dữ liệu

Áp dụng các quy tắc này khi làm phần Data Collection của repo.

## Phạm vi

- Chỉ triển khai collector, cấu hình nguồn RSS, ánh xạ danh mục, lưu bài và số liệu poll, xuất mẫu, hướng dẫn thêm nguồn trong `collector/`.
- Không sửa NLP, gom chủ đề, tính xu hướng, orchestration, backend/database dùng chung, API, frontend, hay tài liệu giao việc chung.
- Có thể đọc tài liệu chung để hiểu hợp đồng. Nếu cần thay đổi file ngoài `collector/`, dừng lại và báo file, lý do, đề xuất cụ thể; chỉ tiếp tục sau khi người dùng đồng ý.
- Không cài package, gọi dịch vụ thu thập bài toàn văn, hoặc đổi cấu hình chung nếu chưa được cho phép.

## Tính đúng đắn

- Không bịa URL, tên danh mục, số lượng bài, lỗi, retention, tỷ lệ trùng hay kết quả trial. Chỉ dùng thông tin được xác nhận trong repo hoặc nguồn RSS đã kiểm tra.
- Phân biệt dữ liệu mẫu với dữ liệu thu thật. Không ghi trial là hoàn tất trước 7 ngày liên tục có poll thật; ghi rõ ngày thiếu, lỗi feed và cách tính chỉ số.
- Không tự gán danh mục lạ. Nếu chưa có ánh xạ đã xác minh, ghi nhận vấn đề và hỏi người dùng.
- Chỉ đọc RSS theo phạm vi đã thống nhất. Không scrape trang bài hoặc thêm nguồn ngoài danh sách nếu chưa được đồng ý.
- Không làm thay đổi hoặc phụ thuộc vào nhánh/phần việc của thành viên khác. Giữ collector có giao diện độc lập; mọi tích hợp cần hợp đồng được xác nhận.

## Trình tự bắt buộc

1. Đọc phân công Person 2, tài liệu trial và hợp đồng dữ liệu liên quan; ghi lại giới hạn và điều chưa rõ.
2. Kiểm tra trạng thái file hiện có. Xác định trước các đường dẫn được phép sửa.
3. Viết các test case cho hành vi và lỗi dự kiến trước khi viết implementation; tối thiểu gồm feed hỏng, thiếu ngày, URL thiếu, URL trùng trong cùng nguồn, bài cùng tiêu đề giữa các nguồn và giữ bài mới của feed còn hoạt động.
4. Viết thay đổi nhỏ nhất trong `collector/`; không refactor phần không thuộc nhiệm vụ.
5. Chạy toàn bộ test của collector, xử lý lỗi cho đến khi đạt; không báo xong khi chưa có test hoặc còn lỗi chưa nêu.
6. Đối chiếu `git status`/diff nếu workspace có Git metadata; nếu không, kiểm tra danh sách file và xác nhận chỉ có thay đổi trong `collector/`.
7. Báo rõ phần đã làm, test đã chạy và kết quả, việc còn chờ dữ liệu thật/ quyết định của nhóm. Không tuyên bố hoàn thành trial nếu chưa đủ dữ liệu.

Nếu không thể chạy test vì thiếu Python hoặc môi trường, ghi chính xác lệnh và lỗi môi trường; không suy diễn rằng test đã qua.
