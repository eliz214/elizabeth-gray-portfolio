import functools
import http.server
import os

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=root)
    http.server.test(HandlerClass=handler, port=8420)
