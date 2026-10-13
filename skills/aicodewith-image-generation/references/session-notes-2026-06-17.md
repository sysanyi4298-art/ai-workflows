# Session notes: AICodeWith image generation

- During task creation, a transient TLS/SSL transport error can occur before any task id is returned (`SSLEOFError: [SSL: UNEXPECTED_EOF_WHILE_READING]`).
- If that happens on the *create* request, retry the same create request once before declaring failure.
- If a task id has already been returned, never create a duplicate task just because polling hits a transport error; keep polling the same task id.
- Polling can also see intermittent SSL EOFs; treat them as transient and continue polling.
- This session successfully generated multiple banners with `gpt-image-2` using 3:1 / 2K / high and one square variant with 1:1 / 1K / medium.