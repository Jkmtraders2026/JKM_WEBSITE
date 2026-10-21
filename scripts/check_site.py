from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.h1=0;self.ids=set();self.errors=[];self.images=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if 'id' in a:
   if a['id'] in self.ids:self.errors.append('duplicate id '+a['id'])
   self.ids.add(a['id'])
  if tag=='img':
   assert 'alt' in a,'image missing alt';self.images.append(a.get('src'))
  for key in ('src','href'):
   if key in a:self.links.append(a[key])
pages=list(ROOT.glob('*.html'));assert len(pages)==16
for file in pages:
 p=Page();p.feed(file.read_text());assert p.h1==1 or file.name=='portal.html',f'{file}: expected one h1';assert not p.errors,p.errors
 for link in p.links:
  u=urlsplit(link)
  if u.scheme or u.netloc or not u.path:continue
  target=ROOT/unquote(u.path)
  assert target.exists(),f'{file.name}: missing {link}'
  if u.fragment:
   other=Page();other.feed(target.read_text());assert u.fragment in other.ids
 assert 'https://wa.me/255699830601' in file.read_text()
 assert 'tel:+255766109131' in file.read_text()
 assert 'tel:+255699830601' in file.read_text()
print(f'PASS: {len(pages)} standalone pages; all local links, scripts and images resolve; accessible image labels and phone/WhatsApp destinations checked.')
from PIL import Image
for file in (ROOT/'assets/images').glob('*.jpg'):
 with Image.open(file) as im:im.verify()
print('PASS: all downloaded image files decode.')
