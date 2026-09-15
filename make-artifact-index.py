import re

with open("index.html") as f:
    src = f.read()

body = re.search(r"<body>(.*)</body>", src, re.DOTALL).group(1).strip()
head = re.search(r"<head>(.*)</head>", src, re.DOTALL).group(1)
# Keep only the tags the artifact skeleton doesn't already provide
# (it supplies its own charset + viewport meta).
head_lines = [
    line for line in head.strip().splitlines()
    if line.strip() and not line.strip().startswith("<meta")
]

with open("artifact-index.html", "w") as f:
    f.write("\n".join(head_lines) + "\n\n" + body + "\n")

print("Regenerated artifact-index.html from index.html")
