from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

THUMB_SIZE = (480, 480)
LARGE_SIZE = (1600, 1600)


def _encode(img, size):
    copy = img.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, 'WEBP', quality=82, method=4)
    return ContentFile(buffer.getvalue())


def build_variants(film_image):
    film_image.image.open('rb')
    with Image.open(film_image.image) as source:
        img = ImageOps.exif_transpose(source).convert('RGB')
    film_image.image.close()

    stem = f'{Path(film_image.image.name).stem}-{film_image.pk}'
    for field, size in (('thumb', THUMB_SIZE), ('large', LARGE_SIZE)):
        target = getattr(film_image, field)
        if target:
            target.delete(save=False)
        target.save(f'{stem}.webp', _encode(img, size), save=False)
