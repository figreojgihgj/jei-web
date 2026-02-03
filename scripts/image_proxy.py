#!/usr/bin/env python
"""Simple image proxy to bypass hotlink/cross-site image restrictions.

Usage:
  python scripts/image_proxy.py --host 127.0.0.1 --port 8088

Request:
  http://127.0.0.1:8088/?url=https://example.com/image.png
  http://127.0.0.1:8088/https://example.com/image.png
"""

from __future__ import annotations

import argparse
import io
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, unquote
from urllib.request import Request, urlopen


HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


def _extract_url(path: str) -> str:
    parsed = urlparse(path)
    if parsed.query:
        qs = parse_qs(parsed.query)
        url = qs.get("url", [""])[0]
        url = unquote(url).lstrip("/")
        return url

    # allow /https://example.com/xxx
    raw = path.lstrip("/")
    return unquote(raw)


def _referer_for(url: str) -> str:
    try:
        parsed = urlparse(url)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}/"
    except Exception:
        pass
    return ""


class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        target_url = _extract_url(self.path)
        if not target_url:
            self.send_response(400)
            self._write_text("Missing url parameter")
            return

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (ImageProxy)",
                "Accept": "image/*,*/*;q=0.8",
            }
            referer = _referer_for(target_url)
            if referer:
                headers["Referer"] = referer

            req = Request(target_url, headers=headers)
            with urlopen(req, timeout=15) as resp:
                status = getattr(resp, "status", 200)
                self.send_response(status)

                for key, value in resp.headers.items():
                    if key.lower() in HOP_BY_HOP_HEADERS:
                        continue
                    self.send_header(key, value)

                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                buffer = io.BytesIO(resp.read())
                self.wfile.write(buffer.getvalue())
        except Exception as exc:  # pragma: no cover
            self.send_response(502)
            self._write_text(f"Proxy error: {exc}")

    def _write_text(self, text: str) -> None:
        body = text.encode("utf-8")
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8088)
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), ProxyHandler)
    print(f"Image proxy running at http://{args.host}:{args.port}")
    print("Example: /?url=https://example.com/image.png")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
