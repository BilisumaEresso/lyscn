import os
from PIL import Image, ImageDraw, ImageFont

fonts_dir = 'dashboard-app/public/fonts'
fonts_to_check = [
    ('Dark Heritage', 'DarkHeritage-Regular.ttf'),
    ('Velvetta', 'Velvetta - Personal Use.otf'),
    ('Fruit Juicer', 'Fruit Juicer.otf'),
    ('Freshtea Healthy', 'Freshtea Healthy.otf'),
    ('Runiga', 'Runiga.otf'),
    ('Transcity', 'Transcity DEMO.otf'),
    ('Coffe Latte', 'Coffe Latte.ttf'),
    ('Grand Hotel', 'GrandHotel-Regular.ttf'),
    ('Gunko Street', 'GunkoStreet-Regular.ttf'),
]

sample_text = "Habesha Heritage Feast"

print("=== FONT VERTICAL METRICS AT 76px ===")
for name, filename in fonts_to_check:
    p = os.path.join(fonts_dir, filename)
    font = ImageFont.truetype(p, 76)
    bbox = font.getbbox("Habesha Heritage Feast")
    # bbox is (left, top, right, bottom) relative to (0,0) baseline / origin
    print(f"{name:15} -> bbox: {bbox}, height: {bbox[3] - bbox[1]}px, top ascender: {bbox[1]}px, bottom descender: {bbox[3]}px")
