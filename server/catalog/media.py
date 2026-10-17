import mimetypes
import re
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, StreamingHttpResponse
from django.utils._os import safe_join

RANGE_RE = re.compile(r'bytes=(\d*)-(\d*)$')
CHUNK = 64 * 1024


def _iter_file(path, start, length):
    with open(path, 'rb') as fh:
        fh.seek(start)
        while length > 0:
            data = fh.read(min(CHUNK, length))
            if not data:
                break
            length -= len(data)
            yield data


def serve_media(request, path):
    try:
        full = Path(safe_join(settings.MEDIA_ROOT, path))
    except ValueError:
        raise Http404
    if not full.is_file():
        raise Http404
    size = full.stat().st_size
    content_type = mimetypes.guess_type(full.name)[0] or 'application/octet-stream'

    match = RANGE_RE.match(request.headers.get('Range', ''))
    if not match or not any(match.groups()):
        response = FileResponse(open(full, 'rb'), content_type=content_type)
    else:
        first, last = match.groups()
        if first:
            start, end = int(first), min(int(last) if last else size - 1, size - 1)
        else:
            start, end = max(size - int(last), 0), size - 1
        if start > end or start >= size:
            response = HttpResponse(status=416)
            response['Content-Range'] = f'bytes */{size}'
            return response
        length = end - start + 1
        response = StreamingHttpResponse(_iter_file(full, start, length), status=206, content_type=content_type)
        response['Content-Range'] = f'bytes {start}-{end}/{size}'
        response['Content-Length'] = str(length)
    response['Accept-Ranges'] = 'bytes'
    response['Cache-Control'] = 'public, max-age=86400'
    return response
