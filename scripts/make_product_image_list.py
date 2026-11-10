import json
import re
from collections import OrderedDict

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

SRC = 'src/data/products.ts'
OUT = 'รายชื่อสินค้าที่ต้องหารูป_2570.xlsx'

REC = re.compile(
    r'id: "(?P<id>[^"]*)", seq: (?P<seq>\d+), name: "(?P<name>[^"]*)", '
    r'category: "(?P<category>[^"]*)", size: "(?P<size>[^"]*)", '
    r'model: "(?P<model>[^"]*)", brand: "(?P<brand>[^"]*)", '
    r'unit: "(?P<unit>[^"]*)", price: (?P<price>[\d.]+), note: "(?P<note>[^"]*)"'
)

items = []
for line in open(SRC, encoding='utf-8'):
    m = REC.search(line)
    if m:
        items.append(m.groupdict())
print('products parsed:', len(items))

# สินค้าที่มีรูปแล้ว (ถ้ามีในฐานข้อมูลโลคอล)
have_image = set()
try:
    db = json.load(open('.local-db/products.json', encoding='utf-8'))
    arr = db if isinstance(db, list) else db.get('products', db.get('items', []))
    for p in arr:
        if p.get('imageUrl'):
            have_image.add(p.get('id'))
except Exception as exc:  # noqa: BLE001
    print('db not readable:', exc)

THIN = Side(style='thin', color='B7C3D0')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
HEAD_FILL = PatternFill('solid', fgColor='1F4E79')
ZEBRA = PatternFill('solid', fgColor='F2F6FA')
HEAD_FONT = Font(name='Tahoma', size=10, bold=True, color='FFFFFF')
BODY_FONT = Font(name='Tahoma', size=10)
TITLE_FONT = Font(name='Tahoma', size=14, bold=True, color='1F4E79')
NOTE_FONT = Font(name='Tahoma', size=9, color='555555')


def style_header(ws, row, ncols):
    for col in range(1, ncols + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = HEAD_FILL
        cell.font = HEAD_FONT
        cell.border = BORDER
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws.row_dimensions[row].height = 34


def style_body(ws, first_row, last_row, ncols, zebra=True):
    for row in range(first_row, last_row + 1):
        for col in range(1, ncols + 1):
            cell = ws.cell(row=row, column=col)
            cell.font = BODY_FONT
            cell.border = BORDER
            cell.alignment = Alignment(vertical='center', wrap_text=(col in (2, 5)))
            if zebra and (row - first_row) % 2 == 1:
                cell.fill = ZEBRA


wb = Workbook()

# ---------- Sheet 1: ชื่อสินค้าไม่ซ้ำ (ใช้เป็นลิสต์ไปหารูป) ----------
ws = wb.active
ws.title = 'ชื่อสินค้า (ไม่ซ้ำ)'
ws['A1'] = 'รายชื่อสินค้าที่ต้องหารูป — งานพัสดุ วิทยาลัยเทคนิคอุดรธานี'
ws['A1'].font = TITLE_FONT
ws.merge_cells('A1:G1')
ws['A2'] = (
    'วิธีใช้: หารูปสินค้าตามชื่อในคอลัมน์ B (1 ชื่อ = 1 รูป ใช้ร่วมกันได้ทุกรุ่น/ขนาด) '
    'แล้วนำไปอัปโหลดที่หน้า ผู้ดูแลระบบ → สินค้า → แก้ไข → อัปโหลดรูป'
)
ws['A2'].font = NOTE_FONT
ws.merge_cells('A2:G2')
ws['A2'].alignment = Alignment(wrap_text=True, vertical='center')
ws.row_dimensions[2].height = 32

headers = ['ลำดับ', 'ชื่อสินค้า', 'หมวดหมู่', 'จำนวนรุ่น/ขนาด', 'รุ่น/ขนาดที่มีในระบบ', 'ชื่อไฟล์รูปแนะนำ', 'สถานะ']
for col, text in enumerate(headers, start=1):
    ws.cell(row=3, column=col, value=text)
style_header(ws, 3, len(headers))

groups = OrderedDict()
for it in items:
    key = it['name'].strip()
    groups.setdefault(key, []).append(it)

row = 4
for index, (name, variants) in enumerate(groups.items(), start=1):
    details = []
    for v in variants:
        bits = [v['size'], v['model'], v['brand']]
        detail = ' / '.join(b for b in bits if b)
        details.append(detail if detail else '-')
    ids = ', '.join(v['id'] for v in variants)
    ws.cell(row=row, column=1, value=index)
    ws.cell(row=row, column=2, value=name)
    ws.cell(row=row, column=3, value=variants[0]['category'])
    ws.cell(row=row, column=4, value=len(variants))
    ws.cell(row=row, column=5, value='; '.join(details) + f'  ({ids})')
    ws.cell(row=row, column=6, value=f"product-{variants[0]['id']}.jpg")
    ws.cell(row=row, column=7, value='ต้องหา' if not all(v['id'] in have_image for v in variants) else 'มีแล้ว')
    row += 1

last = row - 1
style_body(ws, 4, last, len(headers))
ws.freeze_panes = 'A4'
ws.auto_filter.ref = f'A3:G{last}'
widths = [8, 42, 18, 12, 46, 26, 10]
for i, width in enumerate(widths, start=1):
    ws.column_dimensions[get_column_letter(i)].width = width
ws.column_dimensions['A'].alignment = Alignment(horizontal='center')

# ---------- Sheet 2: รายการทั้งหมด 252 ----------
ws2 = wb.create_sheet('รายการทั้งหมด')
ws2['A1'] = f'รายการสินค้าทั้งหมด {len(items)} รายการ'
ws2['A1'].font = TITLE_FONT
ws2.merge_cells('A1:I1')
ws2['A2'] = 'ใช้ชีตนี้เมื่อต้องการอัปโหลดรูปแยกรายรุ่น/ขนาด (1 รูปต่อ 1 รหัสสินค้า)'
ws2['A2'].font = NOTE_FONT
ws2.merge_cells('A2:I2')

headers2 = ['ลำดับ', 'รหัส', 'ชื่อสินค้า', 'ขนาด', 'รุ่น', 'ยี่ห้อ', 'หน่วย', 'ราคา', 'สถานะรูป']
for col, text in enumerate(headers2, start=1):
    ws2.cell(row=3, column=col, value=text)
style_header(ws2, 3, len(headers2))

row = 4
for it in items:
    ws2.cell(row=row, column=1, value=int(it['seq']))
    ws2.cell(row=row, column=2, value=it['id'])
    ws2.cell(row=row, column=3, value=it['name'])
    ws2.cell(row=row, column=4, value=it['size'])
    ws2.cell(row=row, column=5, value=it['model'])
    ws2.cell(row=row, column=6, value=it['brand'])
    ws2.cell(row=row, column=7, value=it['unit'])
    ws2.cell(row=row, column=8, value=float(it['price']))
    ws2.cell(row=row, column=9, value='มีแล้ว' if it['id'] in have_image else 'ต้องหา')
    row += 1

last2 = row - 1
style_body(ws2, 4, last2, len(headers2))
ws2.freeze_panes = 'A4'
ws2.auto_filter.ref = f'A3:I{last2}'
widths2 = [8, 8, 40, 14, 14, 18, 8, 12, 10]
for i, width in enumerate(widths2, start=1):
    ws2.column_dimensions[get_column_letter(i)].width = width
for r in range(4, last2 + 1):
    ws2.cell(row=r, column=8).number_format = '#,##0.00'
    ws2.cell(row=r, column=1).alignment = Alignment(horizontal='center')

wb.save(OUT)
print('saved', OUT, 'unique names', len(groups), 'rows', len(items))
