import re
import time
import shutil
import os

VERSION = str(int(time.time()))
BUILD_DIR = "build"
os.makedirs(BUILD_DIR, exist_ok=True)

def cache_bust(html):
    html = html.replace('href="styles.css"', f'href="styles.css?v={VERSION}"')
    html = html.replace('src="assets/hyperlink.js"', f'src="assets/hyperlink.js?v={VERSION}"')
    html = html.replace('src="assets/lightbox.js"', f'src="assets/lightbox.js?v={VERSION}"')
    html = html.replace('src="assets/carousel.js"', f'src="assets/carousel.js?v={VERSION}"')
    return html

# index.html -> build/artifact-index.html (stripped to artifact page format)
with open("index.html") as f:
    src = f.read()

body = re.search(r"<body>(.*)</body>", src, re.DOTALL).group(1).strip()
head = re.search(r"<head>(.*)</head>", src, re.DOTALL).group(1)
head_lines = [
    line for line in head.strip().splitlines()
    if line.strip() and not line.strip().startswith("<meta")
]
artifact_index = cache_bust("\n".join(head_lines) + "\n\n" + body + "\n")
with open(os.path.join(BUILD_DIR, "artifact-index.html"), "w") as f:
    f.write(artifact_index)

# Other real pages -> build/<name>.html, same content, cache-busted asset refs
for name in ["ameelio-for-families.html", "ameelio-for-attorneys.html", "migraine-mentor.html", "take-back-the-ride.html", "project.html"]:
    with open(name) as f:
        content = f.read()
    with open(os.path.join(BUILD_DIR, name), "w") as f:
        f.write(cache_bust(content))

print(f"Built version {VERSION} into {BUILD_DIR}/")
