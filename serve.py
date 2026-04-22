import os, sys
os.chdir('/Users/gotoken/Documents/Claude/Projects/コーヒー豆の焙煎管理/src')
port = int(os.environ.get('PORT', 8000))
import http.server
handler = http.server.SimpleHTTPRequestHandler
with http.server.HTTPServer(('', port), handler) as httpd:
    print(f'Serving on port {port}', flush=True)
    httpd.serve_forever()
