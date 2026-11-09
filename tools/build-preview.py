"""web/ 폴더를 한 파일짜리 HTML 미리보기로 묶음: python3 tools/build-preview.py <출력경로>"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'web'
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css/style.css').read_text(encoding='utf-8')
body = html[html.index('<body>') + 6: html.index('</body>')]
def inline_js(m):
    return '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</script>'
body = re.sub(r'<script src="([^"]+)"></script>', inline_js, body)
out = ('<title>기타 코드 사전</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
       '<style>\n' + css + '\n.topbar{top:env(safe-area-inset-top,0px)}\n</style>\n' + body)
pathlib.Path(sys.argv[1]).write_text(out, encoding='utf-8')
print('ok', len(out))
