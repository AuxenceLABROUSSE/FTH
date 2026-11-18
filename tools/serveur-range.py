# Serveur statique avec requêtes partielles (Range), comme nginx : nécessaire pour positionner une vidéo.
import http.server, os, re, sys
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        m = re.match(r'bytes=(\d*)-(\d*)', self.headers.get('Range', ''))
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path): return super().send_head()
        size = os.path.getsize(path); a = int(m[1] or 0); z = min(int(m[2]) if m[2] else size - 1, size - 1)
        f = open(path, 'rb'); f.seek(a)
        self.send_response(206); self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {a}-{z}/{size}'); self.send_header('Content-Length', str(z - a + 1))
        self.send_header('Accept-Ranges', 'bytes'); self.end_headers()
        import io; data = f.read(z - a + 1); f.close(); return io.BytesIO(data)
os.chdir(sys.argv[2]); http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
